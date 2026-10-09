"use client";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { CASE_PROFILES } from "@/features/museum/case-profiles";
import type { ShelfGame } from "@/types/museum";
import { useMuseumStore } from "@/stores/museum-store";
import { bandTexture, loadCover, proceduralCover } from "./textures";
import { caseSize } from "./geometry";

const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const planeGeo = new THREE.PlaneGeometry(1, 1);
const bodyMaterials = new Map<string, THREE.MeshPhysicalMaterial>();

function bodyMaterial(profileId: string) {
  let m = bodyMaterials.get(profileId);
  if (!m) {
    const p = CASE_PROFILES[profileId as keyof typeof CASE_PROFILES];
    m = new THREE.MeshPhysicalMaterial({
      color: p.body,
      roughness: p.bodyRoughness,
      metalness: 0.05,
      clearcoat: p.bodyRoughness < 0.4 ? 0.6 : 0.1,
      clearcoatRoughness: 0.3,
      transparent: p.bodyOpacity < 1,
      opacity: p.bodyOpacity,
    });
    bodyMaterials.set(profileId, m);
  }
  return m;
}

type Props = {
  game: ShelfGame;
  position: THREE.Vector3;
  interactive: boolean;
  onDragStart?: (copyId: string, e: ThreeEvent<PointerEvent>) => void;
  hidden?: boolean;
};

/**
 * One physical-looking game case: body box sized by generation profile, optional printed top band
 * and the cover on the front face. Covers come from the catalog (IGDB) or are clearly procedural.
 */
export const GameCase = memo(function GameCase({ game, position, interactive, onDragStart, hidden }: Props) {
  const profile = CASE_PROFILES[game.caseProfile];
  const { w, h, d } = caseSize(game.caseProfile);
  const group = useRef<THREE.Group>(null);
  const coverMat = useRef<THREE.MeshStandardMaterial>(null);
  const invalidate = useThree((s) => s.invalidate);

  const hovered = useMuseumStore((s) => s.hoveredId === game.copyId);
  const selected = useMuseumStore((s) => s.selectedCopyId === game.copyId);
  const highlighted = useMuseumStore((s) => s.highlightCopyId === game.copyId);
  const dimmed = useMuseumStore((s) => (s.selectedCopyId !== null && s.selectedCopyId !== game.copyId) || (s.highlightCopyId !== null && s.highlightCopyId !== game.copyId));
  const dragging = useMuseumStore((s) => s.draggingId === game.copyId);
  const editMode = useMuseumStore((s) => s.editMode);
  const set = useMuseumStore((s) => s.set);

  const bandH = profile.band ? h * profile.band.heightRatio : 0;
  const coverH = h - bandH;
  const fallback = useMemo(
    () => proceduralCover(game.title, game.palette, profile.width / Math.max(1, profile.height * (1 - (profile.band?.heightRatio ?? 0))), game.dataSource === "demo"),
    [game.title, game.palette, game.dataSource, profile],
  );
  const [cover, setCover] = useState<THREE.Texture>(fallback);
  useEffect(() => {
    setCover(fallback);
    if (!game.coverUrl) return;
    let alive = true;
    loadCover(game.coverUrl)
      .then((t) => {
        if (alive) {
          setCover(t);
          invalidate();
        }
      })
      .catch(() => {
        /* keep procedural cover */
      });
    return () => {
      alive = false;
    };
  }, [game.coverUrl, fallback, invalidate]);

  const band = useMemo(() => (profile.band ? bandTexture(profile.band.text, profile.band.color, profile.band.textColor) : null), [profile]);

  // Smooth lift / scale toward targets; keep requesting frames only while moving (on-demand rendering).
  const target = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, dt) => {
    const g = group.current;
    if (!g || dragging) return;
    const lift = selected || highlighted ? 0.16 : hovered ? 0.05 : 0;
    target.set(position.x, position.y + (selected ? 0.03 : 0), position.z + lift);
    const s = selected ? 1.22 : highlighted ? 1.15 : hovered ? 1.04 : 1;
    const k = 1 - Math.exp(-dt * 10);
    g.position.lerp(target, k);
    const ns = THREE.MathUtils.lerp(g.scale.x, s, k);
    g.scale.setScalar(ns);
    const ry = selected ? Math.sin(performance.now() / 1400) * 0.18 : 0;
    g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, ry, k);
    if (coverMat.current) {
      const targetColor = dimmed ? 0.38 : 1;
      const c = coverMat.current.color;
      const nc = THREE.MathUtils.lerp(c.r, targetColor, k);
      c.setScalar(nc);
      coverMat.current.emissiveIntensity = THREE.MathUtils.lerp(coverMat.current.emissiveIntensity, highlighted ? 0.35 : 0, k);
    }
    if (g.position.distanceTo(target) > 0.0005 || Math.abs(ns - s) > 0.001 || selected || Math.abs(g.rotation.y - ry) > 0.001) invalidate();
  });

  const handlers = interactive
    ? {
        onPointerOver: (e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          set({ hoveredId: game.copyId });
          document.body.style.cursor = editMode ? "grab" : "pointer";
          invalidate();
        },
        onPointerOut: () => {
          if (useMuseumStore.getState().hoveredId === game.copyId) set({ hoveredId: null });
          document.body.style.cursor = "";
          invalidate();
        },
        onPointerDown: (e: ThreeEvent<PointerEvent>) => {
          if (useMuseumStore.getState().editMode && onDragStart) {
            e.stopPropagation();
            onDragStart(game.copyId, e);
          }
        },
        onClick: (e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          if (useMuseumStore.getState().editMode) return;
          const st = useMuseumStore.getState();
          // Touch: first tap selects; tapping the selected case again opens details (handled by panel listener).
          set({ selectedCopyId: game.copyId, highlightCopyId: null, selectedAwardId: null });
          window.dispatchEvent(new CustomEvent("gm:case-tap", { detail: { copyId: game.copyId, again: st.selectedCopyId === game.copyId } }));
          invalidate();
        },
      }
    : {};

  return (
    <group ref={group} position={position} visible={!hidden} name={`case-${game.copyId}`} {...handlers}>
      <mesh geometry={boxGeo} material={bodyMaterial(game.caseProfile)} scale={[w, h, d]} />
      <mesh geometry={planeGeo} position={[0, -bandH / 2, d / 2 + 0.0008]} scale={[w * 0.965, coverH * 0.975, 1]}>
        <meshStandardMaterial ref={coverMat} map={cover} roughness={0.42} metalness={0} emissive="#d5b477" emissiveIntensity={0} toneMapped />
      </mesh>
      {band && (
        <mesh geometry={planeGeo} position={[0, h / 2 - bandH / 2, d / 2 + 0.0009]} scale={[w * 0.965, bandH * 0.96, 1]}>
          <meshStandardMaterial map={band} roughness={0.5} />
        </mesh>
      )}
      {(selected || highlighted) && (
        <mesh geometry={planeGeo} position={[0, 0, -d / 2 - 0.01]} scale={[w * 1.25, h * 1.15, 1]}>
          <meshBasicMaterial color="#d5b477" transparent opacity={0.12} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
});
