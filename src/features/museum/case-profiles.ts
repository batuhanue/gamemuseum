import type { CaseProfileId } from "@/lib/db/schema";

/**
 * Physical game case dimensions (millimetres) and finish per generation.
 * These are generic case archetypes; regional/printing variants differ and are not claimed here.
 */
export type CaseProfile = {
  id: CaseProfileId;
  width: number;
  height: number;
  depth: number;
  body: string;
  bodyOpacity: number;
  bodyRoughness: number;
  band?: { color: string; text: string; textColor: string; heightRatio: number };
  /** Front face aspect used to crop cover art. */
  coverAspect: number;
  label: string;
};

export const CASE_PROFILES: Record<CaseProfileId, CaseProfile> = {
  "jewel-case": { id: "jewel-case", width: 142, height: 125, depth: 10, body: "#1b1d22", bodyOpacity: 1, bodyRoughness: 0.15, coverAspect: 1.0, label: "CD jewel case" },
  "dvd-black": { id: "dvd-black", width: 135, height: 190, depth: 14, body: "#0c0d10", bodyOpacity: 1, bodyRoughness: 0.55, coverAspect: 135 / 190, label: "DVD case" },
  "dvd-xbox": { id: "dvd-xbox", width: 135, height: 190, depth: 14, body: "#0d0f0d", bodyOpacity: 1, bodyRoughness: 0.5, band: { color: "#2f8f4e", text: "XBOX", textColor: "#ffffff", heightRatio: 0.085 }, coverAspect: 135 / 190, label: "DVD case" },
  "dvd-x360": { id: "dvd-x360", width: 135, height: 190, depth: 14, body: "#3d8f45", bodyOpacity: 0.92, bodyRoughness: 0.35, band: { color: "#e9ece8", text: "XBOX 360", textColor: "#2f8f4e", heightRatio: 0.075 }, coverAspect: 135 / 190, label: "DVD case" },
  "bluray-ps3": { id: "bluray-ps3", width: 135, height: 170, depth: 14, body: "#101114", bodyOpacity: 0.95, bodyRoughness: 0.25, band: { color: "#0b0b0d", text: "PS3", textColor: "#d7d9de", heightRatio: 0.085 }, coverAspect: 135 / 170, label: "Blu-ray case" },
  "bluray-ps4": { id: "bluray-ps4", width: 135, height: 170, depth: 11, body: "#1f4fbf", bodyOpacity: 0.95, bodyRoughness: 0.3, band: { color: "#1b46ad", text: "PS4", textColor: "#ffffff", heightRatio: 0.085 }, coverAspect: 135 / 170, label: "Blu-ray case" },
  "bluray-ps5": { id: "bluray-ps5", width: 135, height: 170, depth: 11, body: "#2353c8", bodyOpacity: 0.95, bodyRoughness: 0.3, band: { color: "#f4f5f7", text: "PS5", textColor: "#111318", heightRatio: 0.085 }, coverAspect: 135 / 170, label: "Modern case" },
  "bluray-xone": { id: "bluray-xone", width: 135, height: 170, depth: 11, body: "#2e8a43", bodyOpacity: 0.95, bodyRoughness: 0.35, band: { color: "#2f8f4e", text: "XBOX ONE", textColor: "#ffffff", heightRatio: 0.085 }, coverAspect: 135 / 170, label: "Modern case" },
  "bluray-xseries": { id: "bluray-xseries", width: 135, height: 170, depth: 11, body: "#2e8a43", bodyOpacity: 0.95, bodyRoughness: 0.35, band: { color: "#0e0f10", text: "XBOX SERIES X|S", textColor: "#ffffff", heightRatio: 0.085 }, coverAspect: 135 / 170, label: "Modern case" },
  "pc-digital": { id: "pc-digital", width: 128, height: 172, depth: 6, body: "#2a2f37", bodyOpacity: 1, bodyRoughness: 0.4, coverAspect: 128 / 172, label: "Digital display card" },
  "pc-bigbox": { id: "pc-bigbox", width: 190, height: 235, depth: 48, body: "#1a1d22", bodyOpacity: 1, bodyRoughness: 0.7, coverAspect: 190 / 235, label: "PC big box" },
};

/** World units: 1 unit = 1 metre; scene uses a 2.2x exhibition scale so cases read well. */
export const CASE_SCALE = 0.0022;

export function caseProfileFor(generationCase: CaseProfileId, platformId: string, ownership: "physical" | "digital"): CaseProfile {
  if (platformId === "pc") return CASE_PROFILES[ownership === "physical" ? "pc-bigbox" : "pc-digital"];
  return CASE_PROFILES[generationCase];
}
