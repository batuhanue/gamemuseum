import type { ThemeParams } from "@/lib/db/schema";

export type ThemeSeed = {
  id: string;
  name: { tr: string; en: string };
  description: { tr: string; en: string };
  premiumSku: string | null;
  sortOrder: number;
  params: ThemeParams;
};

const baseCamera = { position: [0, 3.0, 12.6] as [number, number, number], target: [0, 2.05, -1.6] as [number, number, number] };

export const THEMES: ThemeSeed[] = [
  {
    id: "modern-museum",
    name: { tr: "Modern Müze", en: "Modern Museum" },
    description: { tr: "Minimal ve premium bir koleksiyon alanı.", en: "A minimal, premium exhibition space." },
    premiumSku: null,
    sortOrder: 0,
    params: {
      wall: "#121519", wallRoughness: 0.82, floor: "#0b0c0f", floorRoughness: 0.28, floorMetalness: 0.35,
      trim: "#d5b477", shelf: "#16191e", shelfMetalness: 0.55, glass: "#c9d6e3",
      ambient: 0.35, ambientColor: "#9aa6b8", keyLight: 1.15, keyColor: "#ffe9c4", ledColor: "#ffdca8", ledIntensity: 1.4,
      fog: "#07080b", fogDensity: 0.035, exposure: 1.05, camera: baseCamera,
    },
  },
  {
    id: "classic-hall",
    name: { tr: "Klasik Salon", en: "Classic Collection Hall" },
    description: { tr: "Ceviz tonları ve sıcak galeri ışığı.", en: "Walnut tones and warm gallery light." },
    premiumSku: null,
    sortOrder: 1,
    params: {
      wall: "#1d1511", wallRoughness: 0.9, floor: "#140e0b", floorRoughness: 0.45, floorMetalness: 0.15,
      trim: "#c9a46a", shelf: "#2b1d14", shelfMetalness: 0.15, glass: "#e7d6bd",
      ambient: 0.42, ambientColor: "#c7a383", keyLight: 1.05, keyColor: "#ffd9a8", ledColor: "#ffc98a", ledIntensity: 1.2,
      fog: "#0d0907", fogDensity: 0.04, exposure: 1.0, camera: baseCamera,
    },
  },
  {
    id: "minimal-gallery",
    name: { tr: "Minimal Galeri", en: "Minimal Gallery" },
    description: { tr: "Açık beton ve yumuşak gün ışığı.", en: "Pale concrete and soft daylight." },
    premiumSku: null,
    sortOrder: 2,
    params: {
      wall: "#3a3d42", wallRoughness: 0.95, floor: "#26282c", floorRoughness: 0.6, floorMetalness: 0.05,
      trim: "#d9d4c9", shelf: "#d8d6d1", shelfMetalness: 0.1, glass: "#ffffff",
      ambient: 0.75, ambientColor: "#dfe4ea", keyLight: 1.0, keyColor: "#ffffff", ledColor: "#fff4e6", ledIntensity: 0.8,
      fog: "#1d1f23", fogDensity: 0.02, exposure: 1.1, camera: baseCamera,
    },
  },
  {
    id: "retro-room",
    name: { tr: "Retro Oda", en: "Retro Gaming Room" },
    description: { tr: "Sıcak ahşap, CRT parıltısı ve 90'lar dokusu.", en: "Warm wood, CRT glow and a 90s texture." },
    premiumSku: "theme.retro-room",
    sortOrder: 3,
    params: {
      wall: "#2a1712", wallRoughness: 0.9, floor: "#1f120d", floorRoughness: 0.7, floorMetalness: 0.05,
      trim: "#e0a457", shelf: "#3a2216", shelfMetalness: 0.1, glass: "#ffe2b8",
      ambient: 0.4, ambientColor: "#e8a87c", keyLight: 0.95, keyColor: "#ffbf7a", ledColor: "#ff9f5a", ledIntensity: 1.3,
      fog: "#120a07", fogDensity: 0.045, exposure: 1.0, camera: baseCamera,
    },
  },
  {
    id: "industrial-archive",
    name: { tr: "Endüstriyel Arşiv", en: "Industrial Archive" },
    description: { tr: "Fırçalanmış çelik, beton ve arşiv rafları.", en: "Brushed steel, concrete and archive racks." },
    premiumSku: "theme.industrial-archive",
    sortOrder: 4,
    params: {
      wall: "#1c1e21", wallRoughness: 0.95, floor: "#141517", floorRoughness: 0.55, floorMetalness: 0.25,
      trim: "#9aa3ad", shelf: "#2b2f34", shelfMetalness: 0.85, glass: "#cfd6de",
      ambient: 0.45, ambientColor: "#a9b4c2", keyLight: 1.1, keyColor: "#e9f0ff", ledColor: "#dfe8ff", ledIntensity: 1.0,
      fog: "#0b0c0e", fogDensity: 0.03, exposure: 1.0, camera: baseCamera,
    },
  },
  {
    id: "cyber-gallery",
    name: { tr: "Siberpunk Galeri", en: "Cyber Gallery" },
    description: { tr: "Kontrollü mor-camgöbeği vurgular.", en: "Controlled violet and cyan accents." },
    premiumSku: "theme.cyber-gallery",
    sortOrder: 5,
    params: {
      wall: "#0f0d17", wallRoughness: 0.6, floor: "#09080f", floorRoughness: 0.22, floorMetalness: 0.5,
      trim: "#8f7cff", shelf: "#15131f", shelfMetalness: 0.6, glass: "#b9a8ff",
      ambient: 0.3, ambientColor: "#7f6cff", keyLight: 1.0, keyColor: "#c9c0ff", ledColor: "#68e3ff", ledIntensity: 1.5,
      fog: "#06050b", fogDensity: 0.04, exposure: 1.05, camera: baseCamera,
    },
  },
];

export const DEFAULT_THEME_ID = "modern-museum";
