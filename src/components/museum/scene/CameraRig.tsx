"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { CameraControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import type CameraControlsImpl from "camera-controls";
import type { ThemeParams } from "@/lib/db/schema";
import { useMuseumStore } from "@/stores/museum-store";
import type { GalleryState } from "@/types/museum";
import { SHELF_ROWS } from "@/features/platforms/reference";
import { AWARD_DAIS, GALLERY_TRANSFORMS, columnLayout, focusLayout, galleryNormal, previewLayout, slotPosition, toWorld, type GalleryKey } from "./geometry";

type Mode = "desktop" | "mobile-preview" | "mobile-explore" | "mobile-shelf" | "static";

const ROOM = new THREE.Box3(new THREE.Vector3(-11.5, 0.35, -6.2), new THREE.Vector3(11.5, 6.6, 16));

/**
 * Bounded camera: never below the floor, through walls or outside the hall. Focus changes animate
 * (respecting reduced motion) and the previous home pose is restored when focus is cleared.
 */
export function CameraRig({ theme, mode, galleries }: { theme: ThemeParams; mode: Mode; galleries: GalleryState[] }) {
  const ref = useRef<CameraControlsImpl>(null);
  const invalidate = useThree((s) => s.invalidate);
  const size = useThree((s) => s.size);
  const focus = useMuseumStore((s) => s.focus);
  const focusGeneration = useMuseumStore((s) => s.focusGeneration);
  const focusAwards = useMuseumStore((s) => s.focusAwards);
  const highlight = useMuseumStore((s) => s.highlightCopyId);
  const pages = useMuseumStore((s) => s.pages);
  const editMode = useMuseumStore((s) => s.editMode);
  const dragging = useMuseumStore((s) => s.draggingId !== null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.setBoundary(ROOM);
    c.boundaryEnclosesCamera = true;
    c.minDistance = 0.9;
    c.maxDistance = mode === "desktop" ? 15 : 12;
    c.minPolarAngle = 0.95;
    c.maxPolarAngle = 1.62;
    c.smoothTime = 0.45;
    c.draggingSmoothTime = 0.12;
    c.dollyToCursor = mode === "desktop";
    if (mode === "mobile-preview") {
      // Horizontal-only look around the entrance, vertical swipes keep scrolling the page.
      c.minPolarAngle = c.maxPolarAngle = 1.36;
      c.minAzimuthAngle = -0.38;
      c.maxAzimuthAngle = 0.38;
      c.mouseButtons.wheel = 0;
      c.touches.two = 0;
      c.touches.three = 0;
    } else {
      c.minAzimuthAngle = -Infinity;
      c.maxAzimuthAngle = Infinity;
    }
  }, [mode]);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.enabled = mode !== "static" && !(editMode && dragging);
  }, [mode, editMode, dragging]);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const animate = !reduce;
    let pos: THREE.Vector3;
    let tgt: THREE.Vector3;

    const highlighted = highlight ? findCase(galleries, highlight, pages, focusGeneration) : null;
    const aspect = size.width / Math.max(1, size.height);
    const vfov = ((mode === "desktop" ? 42 : 50) * Math.PI) / 180;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);
    /** distance so that a w×h area fits the view with a margin */
    const fit = (w: number, h: number) => Math.max(w / 2 / Math.tan(hfov / 2), h / 2 / Math.tan(vfov / 2)) * 1.08;
    if (highlighted) {
      // Frame the case with its neighbours so the visitor sees where on the shelf it lives.
      const n = galleryNormal(highlighted.gallery);
      tgt = highlighted.world.clone();
      if (mode === "desktop") tgt.add(new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), n).multiplyScalar(-0.55));
      pos = tgt.clone().add(n.multiplyScalar(Math.min(6, fit(mode === "desktop" ? 3.4 : 2.0, 2.4)))).add(new THREE.Vector3(0, 0.2, 0));
    } else if (focus && focusGeneration) {
      const g = galleries.find((x) => x.platformId === focus);
      const shelf = g?.shelves.find((s) => s.generationId === focusGeneration);
      const lay = shelf ? focusLayout(shelf.capacity, shelf.caseProfile) : { width: 3, centerX: 0 };
      // Desktop: keep the bay left of the 380px side panel.
      const shift = mode === "desktop" ? lay.width * 0.28 : 0;
      tgt = toWorld(focus, new THREE.Vector3(shift, 1.75, 0));
      const d = Math.min(9, fit(lay.width + (mode === "desktop" ? 1.6 : 0.3), 3.6));
      pos = tgt.clone().add(galleryNormal(focus).multiplyScalar(d)).add(new THREE.Vector3(0, 0.15, 0));
    } else if (focus) {
      const t = GALLERY_TRANSFORMS[focus];
      const shift = mode === "desktop" ? 0.9 : 0;
      tgt = toWorld(focus, new THREE.Vector3(shift, 2.3, 0));
      const d = Math.min(12, fit(8.4 + (mode === "desktop" ? 2.2 : 0), 5.2));
      pos = tgt.clone().add(galleryNormal(focus).multiplyScalar(d)).add(new THREE.Vector3(0, 0.3, 0));
      void t;
    } else if (focusAwards) {
      tgt = new THREE.Vector3(AWARD_DAIS.position[0], 1.05, AWARD_DAIS.position[2]);
      pos = new THREE.Vector3(0, 2.0, AWARD_DAIS.position[2] + 4.6);
    } else {
      const cam = theme.camera;
      pos = new THREE.Vector3(...cam.position);
      tgt = new THREE.Vector3(...cam.target);
      if (mode !== "desktop") pos.set(0, 2.8, 13.6);
    }
    void c.setLookAt(pos.x, pos.y, pos.z, tgt.x, tgt.y, tgt.z, animate).then(() => invalidate());
    invalidate();
  }, [focus, focusGeneration, focusAwards, highlight, theme.camera, mode, galleries, pages, invalidate, size.width, size.height]);

  return <CameraControls ref={ref} makeDefault onChange={() => invalidate()} />;
}

function findCase(galleries: GalleryState[], copyId: string, pages: Record<string, number>, focusGeneration: string | null) {
  for (const g of galleries) {
    const cols = columnLayout(g.shelves.length);
    for (let i = 0; i < g.shelves.length; i++) {
      const s = g.shelves[i]!;
      const idx = s.games.findIndex((x) => x.copyId === copyId);
      if (idx === -1) continue;
      const expanded = focusGeneration === s.generationId;
      const layout = expanded ? focusLayout(s.capacity, s.caseProfile) : previewLayout(cols[i]!, s.caseProfile);
      const perPage = expanded ? s.capacity * SHELF_ROWS : layout.perRow * layout.rows.length;
      const page = expanded ? (pages[s.generationId] ?? Math.floor(idx / perPage)) : 0;
      const inPage = idx - page * perPage;
      if (inPage < 0 || inPage >= perPage) return null;
      const local = slotPosition(inPage, layout, s.caseProfile);
      return { gallery: g.platformId as GalleryKey, world: toWorld(g.platformId as GalleryKey, local) };
    }
  }
  return null;
}
