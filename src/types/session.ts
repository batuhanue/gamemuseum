export type ViewerSummary = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: "user" | "admin";
  emailVerified: boolean;
  onboarded: boolean;
} | null;
