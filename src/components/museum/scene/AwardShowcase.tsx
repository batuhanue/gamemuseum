"use client";
import { memo, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import type { AwardView } from "@/types/museum";
import type { ThemeParams } from "@/lib/db/schema";
import { useMuseumStore } from "@/stores/museum-store";
import { AWARD_DAIS } from "./geometry";
import { TrophyModel } from "./Trophy";
import { labelTexture } from "./textures";

export const SHOWCASE_SLOTS = 7;

/** Pedestal positions on an arc inside the glass rotunda (local to the dais). */
export function pedestalPosition(i: number) {
  const spread = 2.2;
  const a = -spread / 2 + (spread / (SHOWCASE_SLOTS - 1)) * i;
  const r = AWARD_DAIS.radius - 0.75;
  return new THREE.Vector3(Math.sin(a) * r, AWARD_DAIS.height, Math.cos(a) * r * 0.55 - 0.35);
}

function Pedestal({ award, index, theme, quality, labels, interactive }: { award: AwardView; index: number; theme: ThemeParams; quality: "high" | "medium" | "low"; labels: { modelMissing: string; modelFailed: string }; interactive: boolean }) {
  const pos = useMemo(() => pedestalPosition(index), [index]);
  const ref = useRef<THREE.Group>(null);
  const selected = useMuseumStore((s) => s.selectedAwardId === award.id);
  const set = useMuseumStore((s) => s.set);
  const invalidate = useThree((s) => s.invalidate);
  const plate = useMemo(() => labelTexture(award.title.toUpperCase(), { w: 512, h: 96, font: "sans", size: 30, weight: 600, color: "#e9dfc8", bg: "#0b0c0f" }), [award.title]);
  useFrame((_, dt) => {
    if (!ref.current) return;
    if (selected) {
      ref.current.rotation.y += dt * 0.8;
      invalidate();
    }
  });
  return (
    <group position={pos}>
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[0.38, 0.6, 0.38]} />
        <meshStandardMaterial color={theme.shelf} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.605, 0]}>
        <boxGeometry args={[0.4, 0.012, 0.4]} />
        <meshStandardMaterial color={theme.trim} metalness={1} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.2, 0.192]}>
        <planeGeometry args={[0.34, 0.064]} />
        <meshBasicMaterial map={plate} toneMapped={false} />
      </mesh>
      <group
        ref={ref}
        position={[0, 0.612, 0]}
        onClick={(e) => {
          if (!interactive) return;
          e.stopPropagation();
          set({ selectedAwardId: award.id, selectedCopyId: null });
          invalidate();
        }}
        onPointerOver={() => interactive && (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "")}
      >
        <TrophyModel award={award} quality={quality} labels={labels} />
      </group>
    </group>
  );
}

export const AwardShowcase = memo(function AwardShowcase({ awards, theme, quality, labels, interactive }: { awards: AwardView[]; theme: ThemeParams; quality: "high" | "medium" | "low"; labels: { modelMissing: string; modelFailed: string; showcase: string }; interactive: boolean }) {
  const displayed = awards.filter((a) => a.earned?.displayed).slice(0, SHOWCASE_SLOTS);
  const title = useMemo(() => labelTexture(labels.showcase.toUpperCase(), { w: 1024, h: 120, font: "serif", size: 72, weight: 600, color: "#f2eee5", tracking: 3 }), [labels.showcase]);
  const glass = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: theme.glass,
        roughness: 0.04,
        metalness: 0,
        transmission: quality === "high" ? 0.96 : 0,
        transparent: true,
        opacity: quality === "high" ? 1 : 0.12,
        thickness: 0.05,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [theme.glass, quality],
  );
  return (
    <group position={AWARD_DAIS.position}>
      {/* stepped dais */}
      <mesh position={[0, AWARD_DAIS.height / 2, 0]}>
        <cylinderGeometry args={[AWARD_DAIS.radius, AWARD_DAIS.radius + 0.12, AWARD_DAIS.height, 96, 1, false, -1.35, 2.7]} />
        <meshStandardMaterial color={theme.shelf} metalness={0.5} roughness={0.35} />
      </mesh>
      <mesh position={[0, AWARD_DAIS.height + 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[AWARD_DAIS.radius - 0.05, AWARD_DAIS.radius, 96, 1, Math.PI / 2 - 1.35, 2.7]} />
        <meshStandardMaterial color={theme.trim} metalness={1} roughness={0.25} />
      </mesh>
      {/* curved glass wall */}
      <mesh position={[0, AWARD_DAIS.height + 0.6, 0]} material={glass}>
        <cylinderGeometry args={[AWARD_DAIS.radius - 0.1, AWARD_DAIS.radius - 0.1, 1.2, 96, 1, true, -1.3, 2.6]} />
      </mesh>
      <mesh position={[0, AWARD_DAIS.height + 1.21, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[AWARD_DAIS.radius - 0.14, AWARD_DAIS.radius - 0.08, 96, 1, Math.PI / 2 - 1.3, 2.6]} />
        <meshStandardMaterial color={theme.trim} metalness={1} roughness={0.25} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, AWARD_DAIS.height + 1.38, -0.2]} scale={[2.2, 0.26, 1]}>
        <planeGeometry />
        <meshBasicMaterial map={title} transparent toneMapped={false} />
      </mesh>
      {Array.from({ length: SHOWCASE_SLOTS }, (_, i) => {
        const a = displayed[i];
        if (a) return <Pedestal key={a.id} award={a} index={i} theme={theme} quality={quality} labels={labels} interactive={interactive} />;
        const p = pedestalPosition(i);
        return (
          <group key={`empty-${i}`} position={p}>
            <mesh position={[0, 0.15, 0]}>
              <boxGeometry args={[0.38, 0.3, 0.38]} />
              <meshStandardMaterial color={theme.shelf} metalness={0.4} roughness={0.5} transparent opacity={0.55} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
});
