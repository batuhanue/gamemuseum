import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Game Museum",
    short_name: "Museum",
    description: "Every game you own deserves a place.",
    start_url: "/museum",
    display: "standalone",
    orientation: "any",
    background_color: "#080A0E",
    theme_color: "#080A0E",
    icons: [
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
