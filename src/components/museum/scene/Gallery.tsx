"use client";
import { memo, useCallback, useMemo, useRef } from "react";
import * as THREE from "three";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import type { GalleryState, ShelfState } from "@/types/museum";
import type { ThemeParams } from "@/lib/db/schema";
import { SHELF_ROWS } from "@/features/platforms/reference";
import { useMuseumStore } from "@/stores/museum-store";
import { GameCase } from "./GameCase";
import { ModelSlot } from "./ModelAsset";
import { labelTexture, plateTexture } from "./textures";
import {
  CONSOLE_TIER_Y, GALLERY_TRANSFORMS, GALLERY_WIDTH, SHELF_DEPTH, SIGN_Y, WALL_HEIGHT,
  caseSize, columnLayout, focusLayout, galleryMatrix, previewLayout, slotFromLocal, slotPosition, type GalleryKey, type ShelfLayout,
} from "./geometry";

const box = new THREE.BoxGeometry(1, 1, 1);
const plane = new THREE.PlaneGeometry(1, 1);

export type SceneLabels = { modelMissing: string; modelFailed: string; empty: string };

type Mats = {
  wall: THREE.Material;
  shelf: THREE.Material;
  trim: THREE.Material;
  led: THREE.Material;
  dark: THREE.Material;
};

export function useGalleryMaterials(theme: ThemeParams): Mats {
  return useMemo(
    () => ({
      wall: new THREE.MeshStandardMaterial({ color: theme.wall, roughness: theme.wallRoughness, metalness: 0.05 }),
      shelf: new THREE.MeshStandardMaterial({ color: theme.shelf, roughness: 0.35, metalness: theme.shelfMetalness }),
      trim: new THREE.MeshStandardMaterial({ color: theme.trim, roughness: 0.28, metalness: 0.95 }),
      led: new THREE.MeshBasicMaterial({ color: new THREE.Color(theme.ledColor).multiplyScalar(theme.ledIntensity), toneMapped: false }),
      dark: new THREE.MeshStandardMaterial({ color: "#07080a", roughness: 0.6, metalness: 0.3 }),
    }),
    [theme],
  );
}

type ShelfColumnProps = {
  galleryId: GalleryKey;
  shelf: ShelfState;
  layout: ShelfLayout;
  expanded: boolean;
  mats: Mats;
  accent: string;
  interactive: boolean;
  focused: boolean;
  labels: SceneLabels;
  order: string[] | undefined;
  onReorder: (generationId: string, order: string[]) => void;
};

/** One generation column: three lit shelf boards holding a page of cases, plus the drop surface in edit mode. */
const ShelfColumn = memo(function ShelfColumn({ galleryId, shelf, layout, expanded, mats, accent, interactive, focused, labels, order, onReorder }: ShelfColumnProps) {
  const storedPage = useMuseumStore((s) => s.pages[shelf.generationId] ?? 0);
  const page = expanded ? storedPage : 0;
  const editMode = useMuseumStore((s) => s.editMode && focused && expanded);
  const draggingId = useMuseumStore((s) => s.draggingId);
  const dropTarget = useMuseumStore((s) => (s.dropTarget?.generationId === shelf.generationId ? s.dropTarget.index : null));
  const set = useMuseumStore((s) => s.set);
  const invalidate = useThree((s) => s.invalidate);
  const dragGroup = useRef<THREE.Group>(null);

  const perPage = expanded ? shelf.capacity * SHELF_ROWS : layout.perRow * layout.rows.length;
  const ordered = useMemo(() => {
    if (!order) return shelf.games;
    const byId = new Map(shelf.games.map((g) => [g.copyId, g]));
    return order.map((id) => byId.get(id)).filter((g): g is (typeof shelf.games)[number] => !!g);
  }, [order, shelf.games]);
  const visible = ordered.slice(page * perPage, page * perPage + perPage);
  const inverse = useMemo(() => galleryMatrix(galleryId).invert(), [galleryId]);
  const draggingHere = draggingId !== null && visible.some((g) => g.copyId === draggingId);

  const onDragStart = useCallback(
    (copyId: string) => {
      set({ draggingId: copyId, selectedCopyId: null, dropTarget: null });
      invalidate();
    },
    [set, invalidate],
  );

  const toLocal = (e: ThreeEvent<PointerEvent>) => e.point.clone().applyMatrix4(inverse);

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    if (!draggingHere) return;
    e.stopPropagation();
    const local = toLocal(e);
    const idx = slotFromLocal(local, layout, shelf.caseProfile);
    const g = dragGroup.current?.parent?.getObjectByName(`case-${draggingId}`);
    if (g) g.position.set(local.x, local.y, 0.25);
    const absolute = idx === null ? null : Math.min(page * perPage + idx, ordered.length - 1);
    set({ dropTarget: absolute === null ? null : { generationId: shelf.generationId, index: absolute } });
    invalidate();
  };

  const onUp = (e: ThreeEvent<PointerEvent>) => {
    if (!draggingHere || !draggingId) return;
    e.stopPropagation();
    const target = useMuseumStore.getState().dropTarget;
    if (target && target.generationId === shelf.generationId) {
      const ids = ordered.map((g) => g.copyId).filter((id) => id !== draggingId);
      ids.splice(target.index, 0, draggingId);
      onReorder(shelf.generationId, ids);
    }
    // Invalid drop: the case animates back to its previous slot.
    set({ draggingId: null, dropTarget: null });
    invalidate();
  };

  const { h: caseH } = caseSize(shelf.caseProfile);
  const empty = shelf.games.length === 0;

  return (
    <group>
      {layout.rows.map((y, r) => (
        <group key={r} position={[layout.centerX, y, 0]}>
          <mesh geometry={box} material={mats.shelf} position={[0, -0.025, 0.02]} scale={[layout.width - 0.06, 0.05, SHELF_DEPTH]} />
          <mesh geometry={box} material={mats.trim} position={[0, -0.025, SHELF_DEPTH / 2 + 0.024]} scale={[layout.width - 0.06, 0.052, 0.008]} />
          {/* under-shelf LED strip lighting the row below */}
          <mesh geometry={plane} material={mats.led} position={[0, -0.052, 0.12]} rotation={[Math.PI / 2, 0, 0]} scale={[layout.width - 0.16, 0.012, 1]} />
          <mesh geometry={plane} position={[0, caseH / 2 + 0.02, -SHELF_DEPTH / 2 + 0.03]} scale={[layout.width - 0.08, caseH + 0.14, 1]}>
            <meshBasicMaterial color={accent} transparent opacity={0.035} toneMapped={false} />
          </mesh>
        </group>
      ))}
      <group ref={dragGroup} />
      {visible.map((g, i) => (
        <GameCase
          key={g.copyId}
          game={g}
          position={slotPosition(i, layout, shelf.caseProfile)}
          interactive={interactive}
          onDragStart={editMode ? onDragStart : undefined}
        />
      ))}
      {editMode && dropTarget !== null && dropTarget >= page * perPage && (
        <mesh
          geometry={plane}
          position={slotPosition(dropTarget - page * perPage, layout, shelf.caseProfile).add(new THREE.Vector3(0, 0, -0.05))}
          scale={[caseSize(shelf.caseProfile).w * 1.2, caseH * 1.1, 1]}
        >
          <meshBasicMaterial color="#d5b477" transparent opacity={0.45} toneMapped={false} />
        </mesh>
      )}
      {editMode && draggingHere && (
        // Invisible drag surface covering the column; receives pointer moves while dragging.
        <mesh geometry={plane} position={[layout.centerX, 1.6, 0.25]} scale={[layout.width, 3.4, 1]} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={() => set({ dropTarget: null })}>
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
      {empty && (
        <mesh geometry={plane} position={[layout.centerX, (layout.rows[1] ?? layout.rows[0]!) + 0.3, 0.05]} scale={[layout.width * 0.8, 0.1, 1]}>
          <meshBasicMaterial map={labelTexture(labels.empty, { w: 768, h: 96, font: "sans", size: 36, color: "#5e6570" })} transparent toneMapped={false} />
        </mesh>
      )}
    </group>
  );
});

type GalleryProps = {
  gallery: GalleryState;
  theme: ThemeParams;
  interactive: boolean;
  labels: SceneLabels;
  orders: Record<string, string[]>;
  onReorder: (generationId: string, order: string[]) => void;
};

export const PlatformGallery = memo(function PlatformGallery({ gallery, theme, interactive, labels, orders, onReorder }: GalleryProps) {
  const key = gallery.platformId;
  const t = GALLERY_TRANSFORMS[key];
  const mats = useGalleryMaterials(theme);
  const focus = useMuseumStore((s) => s.focus);
  const focusGeneration = useMuseumStore((s) => (s.focus === gallery.platformId ? s.focusGeneration : null));
  const set = useMuseumStore((s) => s.set);
  const columns = useMemo(() => columnLayout(gallery.shelves.length), [gallery.shelves.length]);
  const accent = useMemo(() => new THREE.Color(gallery.accent), [gallery.accent]);
  const accentMat = useMemo(() => new THREE.MeshBasicMaterial({ color: accent.clone().multiplyScalar(1.6), toneMapped: false }), [accent]);
  const signTex = useMemo(() => labelTexture(gallery.name.toUpperCase(), { w: 1024, h: 160, font: "sans", size: 104, weight: 600, color: "#f2eee5", tracking: 2 }), [gallery.name]);
  const taglineTex = useMemo(
    () => (gallery.tagline ? labelTexture(gallery.tagline.toUpperCase(), { w: 1024, h: 64, font: "sans", size: 30, weight: 500, color: "#c9c3b6", tracking: 1 }) : null),
    [gallery.tagline],
  );
  const focused = focus === key;

  return (
    <group position={t.position} rotation={[0, t.rotationY, 0]}>
      {/* Back wall with recessed panel and gold frame */}
      <mesh geometry={box} material={mats.wall} position={[0, WALL_HEIGHT / 2, -0.42]} scale={[GALLERY_WIDTH + 0.6, WALL_HEIGHT, 0.2]} />
      <mesh geometry={box} material={mats.dark} position={[0, 2.05, -0.3]} scale={[GALLERY_WIDTH + 0.1, 2.25, 0.04]} />
      {[[0, 3.92], [0, 0.42]].map(([x, y], i) => (
        <mesh key={i} geometry={box} material={mats.trim} position={[x!, y!, -0.27]} scale={[GALLERY_WIDTH + 0.14, 0.018, 0.02]} />
      ))}
      {[-1, 1].map((sx) => (
        <mesh key={sx} geometry={box} material={mats.trim} position={[sx * (GALLERY_WIDTH / 2 + 0.07), 2.17, -0.27]} scale={[0.018, 3.52, 0.02]} />
      ))}
      {/* Accent light line above the sign */}
      <mesh geometry={box} material={accentMat} position={[0, WALL_HEIGHT - 0.2, -0.3]} scale={[GALLERY_WIDTH * 0.55, 0.012, 0.01]} />

      {/* Sign — clickable to focus the gallery */}
      <group
        position={[0, SIGN_Y, -0.3]}
        onClick={(e) => {
          if (!interactive) return;
          e.stopPropagation();
          window.dispatchEvent(new CustomEvent("gm:gallery", { detail: key }));
        }}
        onPointerOver={() => interactive && (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "")}
      >
        <mesh geometry={plane} position={[0, 0.06, 0.02]} scale={[3.4, 0.53, 1]}>
          <meshBasicMaterial map={signTex} transparent toneMapped={false} />
        </mesh>
        {taglineTex && (
          <mesh geometry={plane} position={[0, -0.33, 0.02]} scale={[3.4, 0.21, 1]}>
            <meshBasicMaterial map={taglineTex} transparent opacity={0.8} toneMapped={false} />
          </mesh>
        )}
      </group>

      {/* Console tier: one display per generation/store with label plate */}
      <mesh geometry={box} material={mats.shelf} position={[0, CONSOLE_TIER_Y - 0.03, 0]} scale={[GALLERY_WIDTH, 0.06, SHELF_DEPTH + 0.08]} />
      <mesh geometry={box} material={mats.trim} position={[0, CONSOLE_TIER_Y - 0.03, SHELF_DEPTH / 2 + 0.045]} scale={[GALLERY_WIDTH, 0.062, 0.01]} />
      {gallery.consoles.map((c, i) => {
        const base = columns[i];
        if (!base) return null;
        if (focusGeneration && focusGeneration !== c.generationId) return null;
        const col = focusGeneration ? { centerX: 0, width: 2.4 } : base;
        const shelf = gallery.shelves[i];
        return (
          <group key={c.generationId} position={[col.centerX, CONSOLE_TIER_Y, 0]}>
            <ModelSlot asset={c.asset} maxSize={[Math.min(col.width * 0.7, 1.2), 0.58, 0.4]} missingLabel={labels.modelMissing} failedLabel={labels.modelFailed} />
            <mesh geometry={plane} position={[0, -0.24, SHELF_DEPTH / 2 + 0.06]} scale={[Math.min(col.width * 0.62, 1.05), 0.33, 1]}>
              <meshBasicMaterial map={plateTexture(c.label, shelf?.years ?? (shelf ? `${shelf.games.length}` : null), gallery.accent)} toneMapped={false} />
            </mesh>
          </group>
        );
      })}

      {/* Shelf columns per generation */}
      {gallery.shelves.map((shelf, i) => {
        if (focusGeneration && focusGeneration !== shelf.generationId) return null;
        const expanded = focusGeneration === shelf.generationId;
        const layout = expanded ? focusLayout(shelf.capacity, shelf.caseProfile) : previewLayout(columns[i]!, shelf.caseProfile);
        return (
        <ShelfColumn
          key={shelf.generationId}
          galleryId={key}
          shelf={shelf}
          layout={layout}
          expanded={expanded}
          mats={mats}
          accent={gallery.accent}
          interactive={interactive}
          focused={focused}
          labels={labels}
          order={orders[shelf.generationId]}
          onReorder={onReorder}
        />
        );
      })}

      {/* In a focused gallery, clicking a generation column expands it into a full shelf bay. */}
      {interactive && focused && !focusGeneration &&
        gallery.shelves.map((shelf, i) => (
          <mesh
            key={`hit-${shelf.generationId}`}
            geometry={plane}
            position={[columns[i]!.centerX, 1.7, 0.45]}
            scale={[columns[i]!.width, 3.0, 1]}
            onClick={(e) => {
              e.stopPropagation();
              set({ focusGeneration: shelf.generationId, selectedCopyId: null, highlightCopyId: null });
            }}
            onPointerOver={() => (document.body.style.cursor = "zoom-in")}
            onPointerOut={() => (document.body.style.cursor = "")}
          >
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        ))}

      {/* Focus hit area for the whole gallery when not focused (desktop click → camera move) */}
      {interactive && !focused && (
        <mesh
          geometry={plane}
          position={[0, 2.4, 0.6]}
          scale={[GALLERY_WIDTH, 4.6, 1]}
          onClick={(e) => {
            e.stopPropagation();
            set({ selectedCopyId: null });
            window.dispatchEvent(new CustomEvent("gm:gallery", { detail: key }));
          }}
        >
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
});
