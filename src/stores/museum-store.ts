"use client";
import { create } from "zustand";
import type { ThemeParams } from "@/lib/db/schema";

export type GalleryId = "xbox" | "playstation" | "pc";
export type Quality = "high" | "medium" | "low";
export type WebglState = "unknown" | "ok" | "unsupported" | "lost" | "error";

type MuseumUiState = {
  focus: GalleryId | null;
  focusGeneration: string | null;
  focusAwards: boolean;
  selectedCopyId: string | null;
  highlightCopyId: string | null;
  hoveredId: string | null;
  selectedAwardId: string | null;
  editMode: boolean;
  draggingId: string | null;
  dropTarget: { generationId: string; index: number } | null;
  pages: Record<string, number>;
  previewTheme: ThemeParams | null;
  quality: Quality;
  webgl: WebglState;
  exploreMode: boolean; // mobile full-screen exploration
  set: (patch: Partial<MuseumUiState>) => void;
  setPage: (generationId: string, page: number) => void;
  reset: () => void;
};

const initial = {
  focus: null,
  focusGeneration: null,
  focusAwards: false,
  selectedCopyId: null,
  highlightCopyId: null,
  hoveredId: null,
  selectedAwardId: null,
  editMode: false,
  draggingId: null,
  dropTarget: null,
  pages: {},
  previewTheme: null,
  quality: "high" as Quality,
  webgl: "unknown" as WebglState,
  exploreMode: false,
};

/** Transient 3D/UI interaction state only. Persistent data lives on the server (TanStack Query). */
export const useMuseumStore = create<MuseumUiState>((set) => ({
  ...initial,
  set: (patch) => set(patch),
  setPage: (generationId, page) => set((s) => ({ pages: { ...s.pages, [generationId]: page } })),
  reset: () => set({ selectedCopyId: null, hoveredId: null, selectedAwardId: null, draggingId: null, dropTarget: null }),
}));
