import { route, json } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { listJobs } from "@/services/imports";

export const GET = route(async () => {
  const user = await requireUser();
  return json({ jobs: await listJobs(user.id) });
});
