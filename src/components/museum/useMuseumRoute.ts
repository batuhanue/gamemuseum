"use client";
import { usePathname } from "next/navigation";
import type { GalleryId } from "@/stores/museum-store";

export type MuseumRoute =
  | { kind: "home" }
  | { kind: "gallery"; gallery: GalleryId }
  | { kind: "awards" }
  | { kind: "customize" };

export function parseMuseumRoute(path: string, basePath: string): MuseumRoute {
  const rest = path === "/" ? "" : path.startsWith(basePath) ? path.slice(basePath.length).replace(/^\//, "") : "";
  const seg = rest.split("/")[0];
  if (seg === "xbox" || seg === "playstation" || seg === "pc") return { kind: "gallery", gallery: seg };
  if (seg === "awards") return { kind: "awards" };
  if (seg === "customize") return { kind: "customize" };
  return { kind: "home" };
}

export function useMuseumRoute(basePath: string) {
  return parseMuseumRoute(usePathname(), basePath);
}
