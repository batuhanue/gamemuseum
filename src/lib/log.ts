import "server-only";
import { newId } from "./ids";

/** Records server errors to stdout and to the error_log table shown in /admin. Never throws. */
export async function logError(scope: string, err: unknown, detail?: Record<string, unknown>) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[${scope}]`, err);
  try {
    const { getDb } = await import("./db/client");
    const { errorLog } = await import("./db/schema");
    const db = await getDb();
    await db.insert(errorLog).values({ id: newId("err"), scope, message: message.slice(0, 1000), detail: { ...detail, stack: err instanceof Error ? err.stack?.slice(0, 2000) : undefined } });
  } catch {
    /* logging must not cascade */
  }
}
