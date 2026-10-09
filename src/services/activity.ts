import "server-only";
import { getDb } from "@/lib/db/client";
import { activityEvents } from "@/lib/db/schema";
import { newId } from "@/lib/ids";

export async function recordEvent(userId: string, type: string, payload: Record<string, unknown>) {
  const db = await getDb();
  await db.insert(activityEvents).values({ id: newId("evt"), userId, type, payload });
}
