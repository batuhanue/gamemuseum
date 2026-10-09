import "server-only";
import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { authTokens, oauthAccounts, users } from "@/lib/db/schema";
import { newId, randomToken, sha256, slugify } from "@/lib/ids";
import { AppError } from "@/lib/errors";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { appUrl, sendMail, type MailResult } from "@/lib/email";
import { recordEvent } from "./activity";

function isBootstrapAdmin(email: string) {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}

export async function registerUser(input: { email: string; username: string; password: string; locale?: "tr" | "en" }) {
  const db = await getDb();
  const existing = await db.select({ id: users.id, email: users.email, username: users.username }).from(users)
    .where(eq(users.email, input.email)).limit(1);
  if (existing.length) throw new AppError("conflict", "Email already registered", { field: "email" });
  const taken = await db.select({ id: users.id }).from(users).where(eq(users.username, input.username.toLowerCase())).limit(1);
  if (taken.length) throw new AppError("conflict", "Username taken", { field: "username" });

  const id = newId("usr");
  await db.insert(users).values({
    id,
    email: input.email,
    username: input.username.toLowerCase(),
    displayName: input.username,
    passwordHash: await hashPassword(input.password),
    role: isBootstrapAdmin(input.email) ? "admin" : "user",
    locale: input.locale ?? "tr",
    shareToken: randomToken(18),
  });
  await recordEvent(id, "account_created", {});
  const mail = await sendVerificationEmail(id, input.email).catch(() => ({ delivered: false, channel: "none" }) as MailResult);
  return { id, mail };
}

let dummy: Promise<string> | undefined;
const dummyHash = () => (dummy ??= hashPassword("timing-equaliser"));

export async function authenticate(email: string, password: string) {
  const db = await getDb();
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  // Constant-ish work even when the user is unknown.
  const ok = user?.passwordHash ? await verifyPassword(password, user.passwordHash) : (await verifyPassword(password, await dummyHash()), false);
  if (!user || !ok) throw new AppError("unauthorized", "Invalid email or password");
  return user;
}

async function issueToken(userId: string, type: "verify-email" | "reset-password", ttlMs: number) {
  const db = await getDb();
  const token = randomToken();
  await db.insert(authTokens).values({ id: sha256(token), userId, type, expiresAt: new Date(Date.now() + ttlMs) });
  return token;
}

export async function sendVerificationEmail(userId: string, email: string) {
  const token = await issueToken(userId, "verify-email", 48 * 3600e3);
  return sendMail(email, "Game Museum — e-posta doğrulama / verify your e-mail", `${appUrl(`/api/auth/verify?token=${token}`)}`);
}

async function consumeToken(token: string, type: "verify-email" | "reset-password") {
  const db = await getDb();
  const [row] = await db.update(authTokens).set({ usedAt: new Date() })
    .where(and(eq(authTokens.id, sha256(token)), eq(authTokens.type, type), isNull(authTokens.usedAt), gt(authTokens.expiresAt, new Date())))
    .returning();
  if (!row) throw new AppError("invalid", "Link is invalid or expired");
  return row.userId;
}

export async function verifyEmail(token: string) {
  const userId = await consumeToken(token, "verify-email");
  const db = await getDb();
  await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, userId));
  return userId;
}

export async function requestPasswordReset(email: string): Promise<MailResult | null> {
  const db = await getDb();
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (!user) return null; // do not reveal whether the e-mail exists
  const token = await issueToken(user.id, "reset-password", 3600e3);
  return sendMail(email, "Game Museum — şifre sıfırlama / reset password", appUrl(`/login/reset?token=${token}`));
}

export async function resetPassword(token: string, password: string) {
  const userId = await consumeToken(token, "reset-password");
  const db = await getDb();
  await db.update(users).set({ passwordHash: await hashPassword(password), updatedAt: new Date() }).where(eq(users.id, userId));
  return userId;
}

export async function changePassword(userId: string, current: string | undefined, next: string) {
  const db = await getDb();
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new AppError("not_found", "User not found");
  if (user.passwordHash && !(current && (await verifyPassword(current, user.passwordHash)))) {
    throw new AppError("unauthorized", "Current password is incorrect");
  }
  await db.update(users).set({ passwordHash: await hashPassword(next), updatedAt: new Date() }).where(eq(users.id, userId));
}

/** Google sign-in: link by provider id, else by verified e-mail, else create. */
export async function upsertOAuthUser(provider: "google", providerAccountId: string, email: string, name: string, avatar?: string) {
  const db = await getDb();
  const [linked] = await db.select().from(oauthAccounts)
    .where(and(eq(oauthAccounts.provider, provider), eq(oauthAccounts.providerAccountId, providerAccountId))).limit(1);
  if (linked) return linked.userId;
  const [byEmail] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  let userId = byEmail?.id;
  if (!userId) {
    userId = newId("usr");
    let base = slugify(name || email.split("@")[0] || "collector").replace(/-/g, "_").slice(0, 18) || "collector";
    if (base.length < 3) base = `${base}_gm`;
    let username = base;
    for (let i = 0; i < 20; i++) {
      const [t] = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
      if (!t) break;
      username = `${base}_${Math.floor(Math.random() * 9000 + 1000)}`;
    }
    await db.insert(users).values({
      id: userId, email: email.toLowerCase(), username, displayName: name || username, avatarUrl: avatar,
      emailVerifiedAt: new Date(), role: isBootstrapAdmin(email) ? "admin" : "user", shareToken: randomToken(18),
    });
    await recordEvent(userId, "account_created", { provider });
  }
  await db.insert(oauthAccounts).values({ provider, providerAccountId, userId }).onConflictDoNothing();
  return userId;
}

export async function deleteAccount(userId: string) {
  const db = await getDb();
  // FK cascades remove sessions, copies, placements, awards, goals, objects, jobs and events.
  await db.delete(users).where(eq(users.id, userId));
}
