import "server-only";
import { Google } from "arctic";
import { appUrl } from "../email";

export function googleConfigured() {
  return !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;
}

export function googleClient() {
  return new Google(process.env.GOOGLE_CLIENT_ID!, process.env.GOOGLE_CLIENT_SECRET!, appUrl("/api/auth/google/callback"));
}
