"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api, ApiError } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shell/PlatformMark";
import { LocaleSwitch } from "@/components/shell/LocaleSwitch";

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  const t = useTranslations();
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,rgba(213,180,119,0.16),transparent_55%),radial-gradient(ellipse_at_10%_110%,rgba(69,179,107,0.08),transparent_50%),radial-gradient(ellipse_at_90%_110%,rgba(71,125,255,0.1),transparent_50%)]" />
      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Link href="/"><Logo /></Link>
          <div className="text-[10px] tracking-[0.3em] text-slate">{t("common.tagline")}</div>
        </div>
        <div className="panel p-6 sm:p-8">
          <h1 className="display mb-6 text-center text-3xl">{title}</h1>
          {children}
        </div>
        <div className="mt-6 flex justify-center"><LocaleSwitch /></div>
      </div>
    </div>
  );
}

function GoogleButton() {
  const t = useTranslations();
  return (
    <>
      <Button asChild variant="secondary" className="w-full">
        <a href="/api/auth/google">{t("auth.google")}</a>
      </Button>
      <div className="my-5 flex items-center gap-3 text-[11px] text-slate"><span className="h-px flex-1 bg-white/10" />{t("auth.or")}<span className="h-px flex-1 bg-white/10" /></div>
    </>
  );
}

function FieldError({ msg }: { msg?: string }) {
  return msg ? <p role="alert" className="mt-1 text-xs text-[#ff9a92]">{msg}</p> : null;
}

const safeNext = (n: string | null) => (n && n.startsWith("/") && !n.startsWith("//") ? n : null);

export function LoginForm() {
  const t = useTranslations();
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(params.get("error") === "google_unavailable" ? t("auth.googleUnavailable") : params.get("error") ? t("common.error") : null);
  const [forgot, setForgot] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const schema = z.object({ email: z.string().email(), password: forgot ? z.string() : z.string().min(1) });
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

  const submit = form.handleSubmit(async (v) => {
    setError(null);
    try {
      if (forgot) {
        const r = await api<{ mailConfigured: boolean; devLog: boolean }>("/api/auth/forgot", { method: "POST", body: { email: v.email } });
        setNotice(r.mailConfigured ? t("auth.resetSent") : r.devLog ? t("auth.resetDevLog") : t("auth.resetNoMail"));
        return;
      }
      const r = await api<{ onboarded: boolean }>("/api/auth/login", { method: "POST", body: v });
      router.push(safeNext(params.get("next")) ?? (r.onboarded ? "/museum" : "/onboarding"));
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError && e.status === 401 ? t("auth.invalid") : e instanceof ApiError && e.status === 429 ? t("errors.rateLimited") : t("common.error"));
    }
  });

  return (
    <Shell title={forgot ? t("auth.forgot") : t("auth.loginTitle")}>
      {!forgot && <GoogleButton />}
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label className="label" htmlFor="email">{t("auth.email")}</label>
          <input id="email" type="email" autoComplete="email" className="field" {...form.register("email")} />
          <FieldError msg={form.formState.errors.email && t("auth.email")} />
        </div>
        {!forgot && (
          <div>
            <label className="label" htmlFor="password">{t("auth.password")}</label>
            <input id="password" type="password" autoComplete="current-password" className="field" {...form.register("password")} />
          </div>
        )}
        {error && <p role="alert" className="text-sm text-[#ff9a92]">{error}</p>}
        {notice && <p role="status" className="text-sm text-gold">{notice}</p>}
        <Button type="submit" variant="primary" className="w-full" disabled={form.formState.isSubmitting}>
          {forgot ? t("auth.sendReset") : t("common.signIn")}
        </Button>
      </form>
      <div className="mt-5 flex items-center justify-between text-xs text-slate">
        <button onClick={() => { setForgot(!forgot); setNotice(null); setError(null); }} className="hover:text-ivory">{forgot ? t("common.back") : t("auth.forgot")}</button>
        <span>{t("auth.noAccount")} <Link href="/register" className="text-gold hover:underline">{t("common.signUp")}</Link></span>
      </div>
    </Shell>
  );
}

export function RegisterForm() {
  const t = useTranslations();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const schema = z.object({
    email: z.string().email(),
    username: z.string().min(3).max(24).regex(/^[a-zA-Z0-9_.]+$/),
    password: z.string().min(8),
  });
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  const submit = form.handleSubmit(async (v) => {
    setError(null);
    try {
      await api("/api/auth/register", { method: "POST", body: v });
      router.push("/onboarding");
      router.refresh();
    } catch (e) {
      const field = e instanceof ApiError ? (e.details as { field?: string } | undefined)?.field : undefined;
      setError(field === "email" ? t("auth.emailTaken") : field === "username" ? t("auth.usernameTaken") : e instanceof ApiError && e.status === 429 ? t("errors.rateLimited") : t("common.error"));
    }
  });
  const errs = form.formState.errors;
  return (
    <Shell title={t("auth.registerTitle")}>
      <GoogleButton />
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label className="label" htmlFor="r-email">{t("auth.email")}</label>
          <input id="r-email" type="email" autoComplete="email" className="field" {...form.register("email")} aria-invalid={!!errs.email} />
          <FieldError msg={errs.email && t("auth.email")} />
        </div>
        <div>
          <label className="label" htmlFor="r-username">{t("auth.username")}</label>
          <input id="r-username" autoComplete="username" className="field" {...form.register("username")} aria-invalid={!!errs.username} aria-describedby="r-username-hint" />
          <p id="r-username-hint" className="mt-1 text-[11px] text-slate">{t("auth.usernameHint")}</p>
        </div>
        <div>
          <label className="label" htmlFor="r-password">{t("auth.password")}</label>
          <input id="r-password" type="password" autoComplete="new-password" className="field" {...form.register("password")} aria-invalid={!!errs.password} aria-describedby="r-password-hint" />
          <p id="r-password-hint" className="mt-1 text-[11px] text-slate">{t("auth.passwordHint")}</p>
        </div>
        {error && <p role="alert" className="text-sm text-[#ff9a92]">{error}</p>}
        <Button type="submit" variant="primary" className="w-full" disabled={form.formState.isSubmitting}>{t("common.signUp")}</Button>
        <p className="text-[11px] leading-relaxed text-slate">{t("auth.legal")}</p>
      </form>
      <div className="mt-5 text-center text-xs text-slate">
        {t("auth.haveAccount")} <Link href="/login" className="text-gold hover:underline">{t("common.signIn")}</Link>
      </div>
    </Shell>
  );
}

export function ResetForm() {
  const t = useTranslations();
  const router = useRouter();
  const params = useSearchParams();
  const [pw, setPw] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <Shell title={t("auth.resetTitle")}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await api("/api/auth/reset", { method: "POST", body: { token: params.get("token"), password: pw } });
            router.push("/museum");
            router.refresh();
          } catch (err) {
            setError(err instanceof ApiError ? err.message : t("common.error"));
          }
        }}
      >
        <label className="label" htmlFor="np">{t("auth.newPassword")}</label>
        <input id="np" type="password" minLength={8} required autoComplete="new-password" className="field" value={pw} onChange={(e) => setPw(e.target.value)} />
        {error && <p role="alert" className="text-sm text-[#ff9a92]">{error}</p>}
        <Button type="submit" variant="primary" className="w-full">{t("common.save")}</Button>
      </form>
    </Shell>
  );
}
