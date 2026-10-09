import * as THREE from "three";
import { CASE_PROFILES, CASE_SCALE } from "@/features/museum/case-profiles";
import type { CaseProfileId } from "@/lib/db/schema";

export type GalleryKey = "xbox" | "playstation" | "pc";

/** Exhibition scale for cases: real millimetres → metres, enlarged ×3.6 so covers read like museum pieces. */
export const EXHIBIT_SCALE = CASE_SCALE * (3.6 / 2.2);

export const GALLERY_WIDTH = 7.6;
export const WALL_HEIGHT = 5.4;
/** Hall view: two preview rows per generation column. Focused view: three full rows. */
export const PREVIEW_ROWS_Y = [1.98, 0.98];
export const FOCUS_ROWS_Y = [2.04, 1.08, 0.12];
export const ROW_BASE_Y = FOCUS_ROWS_Y;
export const CONSOLE_TIER_Y = 3.22;
export const SIGN_Y = 4.62;
export const SHELF_DEPTH = 0.42;
export const COLUMN_PADDING = 0.14;

/** Galleries sit on an arc facing the visitor: Xbox left, PlayStation centre, PC right. */
export const GALLERY_TRANSFORMS: Record<GalleryKey, { position: [number, number, number]; rotationY: number }> = {
  xbox: { position: [-7.75, 0, -3.15], rotationY: 0.62 },
  playstation: { position: [0, 0, -6.1], rotationY: 0 },
  pc: { position: [7.75, 0, -3.15], rotationY: -0.62 },
};

export const AWARD_DAIS = { position: [0, 0, 1.55] as [number, number, number], radius: 2.75, height: 0.42 };

export function caseSize(profile: CaseProfileId) {
  const p = CASE_PROFILES[profile];
  return { w: p.width * EXHIBIT_SCALE, h: p.height * EXHIBIT_SCALE, d: p.depth * EXHIBIT_SCALE };
}

export function columnLayout(columns: number) {
  const colW = GALLERY_WIDTH / columns;
  return Array.from({ length: columns }, (_, i) => ({ centerX: -GALLERY_WIDTH / 2 + colW * (i + 0.5), width: colW }));
}

export type ShelfLayout = { centerX: number; width: number; perRow: number; rows: number[] };

export function casePitch(profile: CaseProfileId) {
  return caseSize(profile).w + 0.05;
}

/** Hall preview: as many cases as fit in the generation column, two rows. */
export function previewLayout(column: { centerX: number; width: number }, profile: CaseProfileId): ShelfLayout {
  const perRow = Math.max(1, Math.floor((column.width - COLUMN_PADDING * 2) / casePitch(profile)));
  return { centerX: column.centerX, width: column.width, perRow, rows: PREVIEW_ROWS_Y };
}

/** Focused generation: the shelf module (capacity per row) spans the middle of the gallery wall, three rows. */
export function focusLayout(capacity: number, profile: CaseProfileId): ShelfLayout {
  const width = Math.min(GALLERY_WIDTH, capacity * casePitch(profile) + COLUMN_PADDING * 2 + 0.3);
  return { centerX: 0, width, perRow: capacity, rows: FOCUS_ROWS_Y };
}

/** Local (gallery space) position for a case at index within the visible page. */
export function slotPosition(indexInPage: number, layout: ShelfLayout, profile: CaseProfileId) {
  const row = Math.floor(indexInPage / layout.perRow);
  const col = indexInPage % layout.perRow;
  const { h } = caseSize(profile);
  const pitch = casePitch(profile);
  const startX = layout.centerX - (pitch * (layout.perRow - 1)) / 2;
  return new THREE.Vector3(startX + col * pitch, (layout.rows[row] ?? layout.rows[0]!) + h / 2 + 0.004, 0.02);
}

/** Inverse of slotPosition for drag-and-drop: nearest slot for a local point, or null when outside the shelf. */
export function slotFromLocal(point: THREE.Vector3, layout: ShelfLayout, profile: CaseProfileId) {
  if (Math.abs(point.x - layout.centerX) > layout.width / 2) return null;
  const { h } = caseSize(profile);
  const pitch = casePitch(profile);
  const startX = layout.centerX - (pitch * (layout.perRow - 1)) / 2;
  const col = Math.max(0, Math.min(layout.perRow - 1, Math.round((point.x - startX) / pitch)));
  let row = -1;
  layout.rows.forEach((base, r) => {
    if (point.y >= base - 0.12 && point.y <= base + h + 0.15) row = r;
  });
  if (row === -1) return null;
  return row * layout.perRow + col;
}

export function galleryMatrix(key: GalleryKey) {
  const t = GALLERY_TRANSFORMS[key];
  return new THREE.Matrix4().compose(new THREE.Vector3(...t.position), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, t.rotationY, 0)), new THREE.Vector3(1, 1, 1));
}

export function galleryNormal(key: GalleryKey) {
  return new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), GALLERY_TRANSFORMS[key].rotationY);
}

export function toWorld(key: GalleryKey, local: THREE.Vector3) {
  return local.clone().applyMatrix4(galleryMatrix(key));
}
