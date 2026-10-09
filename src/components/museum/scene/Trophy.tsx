"use client";
import { useMemo } from "react";
import * as THREE from "three";
import type { AwardView } from "@/types/museum";
import { ModelSlot } from "./ModelAsset";

const MATERIALS: Record<AwardView["material"], THREE.MeshPhysicalMaterialParameters> = {
  bronze: { color: "#a8693a", metalness: 1, roughness: 0.32 },
  silver: { color: "#cfd4da", metalness: 1, roughness: 0.18 },
  gold: { color: "#d5b477", metalness: 1, roughness: 0.16 },
  crystal: { color: "#dfe9ff", metalness: 0, roughness: 0.02, transmission: 0.92, thickness: 0.4, ior: 1.6, transparent: true, opacity: 0.95 },
  obsidian: { color: "#141018", metalness: 0.6, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05, sheen: 1, sheenColor: new THREE.Color("#8f7cff") },
};

const matCache = new Map<string, THREE.MeshPhysicalMaterial>();
export function trophyMaterial(kind: AwardView["material"], quality: "high" | "medium" | "low") {
  const key = `${kind}:${quality}`;
  let m = matCache.get(key);
  if (!m) {
    const p = { ...MATERIALS[kind] };
    if (quality !== "high" && p.transmission) {
      // Transmission is expensive on phones: fall back to a transparent physical material.
      delete p.transmission;
      p.opacity = 0.7;
    }
    m = new THREE.MeshPhysicalMaterial({ envMapIntensity: 1.2, ...p });
    matCache.set(key, m);
  }
  return m;
}

const baseMaterial = new THREE.MeshPhysicalMaterial({ color: "#121316", metalness: 0.7, roughness: 0.22, clearcoat: 0.8, clearcoatRoughness: 0.15 });

const rarityShape: Record<AwardView["rarity"], "medal" | "cup" | "crystal" | "orb"> = {
  common: "medal",
  rare: "cup",
  epic: "crystal",
  legendary: "orb",
};

/**
 * Abstract geometric trophy used until a dedicated award model is uploaded for the definition.
 * Shape communicates rarity; material communicates tier.
 */
export function AbstractTrophy({ award, quality }: { award: Pick<AwardView, "rarity" | "material">; quality: "high" | "medium" | "low" }) {
  const mat = trophyMaterial(award.material, quality);
  const base = baseMaterial;
  const shape = rarityShape[award.rarity];
  const cupProfile = useMemo(() => {
    const pts = [
      [0.0, 0], [0.07, 0], [0.07, 0.02], [0.025, 0.05], [0.02, 0.17], [0.06, 0.2], [0.12, 0.27], [0.135, 0.38], [0.13, 0.4], [0.11, 0.4], [0.105, 0.3], [0.0, 0.25],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(pts, 48);
  }, []);
  return (
    <group>
      <mesh material={base} position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.14, 0.16, 0.08, 40]} />
      </mesh>
      <group position={[0, 0.08, 0]}>
        {shape === "medal" && (
          <group>
            <mesh material={mat} position={[0, 0.06, 0]}>
              <cylinderGeometry args={[0.02, 0.03, 0.12, 16]} />
            </mesh>
            <mesh material={mat} position={[0, 0.25, 0]}>
              <torusGeometry args={[0.11, 0.022, 20, 64]} />
            </mesh>
            <mesh material={mat} position={[0, 0.25, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.085, 0.085, 0.02, 48]} />
            </mesh>
          </group>
        )}
        {shape === "cup" && <mesh material={mat} geometry={cupProfile} scale={1.15} />}
        {shape === "crystal" && (
          <mesh material={mat} position={[0, 0.24, 0]} scale={[0.75, 1.45, 0.75]}>
            <octahedronGeometry args={[0.16, 0]} />
          </mesh>
        )}
        {shape === "orb" && (
          <group>
            <mesh material={mat} position={[0, 0.07, 0]}>
              <cylinderGeometry args={[0.03, 0.06, 0.14, 24]} />
            </mesh>
            <mesh material={mat} position={[0, 0.27, 0]}>
              <icosahedronGeometry args={[0.13, 2]} />
            </mesh>
            <mesh material={base} position={[0, 0.27, 0]} rotation={[0.4, 0, 0.3]}>
              <torusGeometry args={[0.17, 0.008, 12, 80]} />
            </mesh>
          </group>
        )}
      </group>
    </group>
  );
}

export function TrophyModel({ award, quality, labels }: { award: AwardView; quality: "high" | "medium" | "low"; labels: { modelMissing: string; modelFailed: string } }) {
  if (award.asset) return <ModelSlot asset={award.asset} maxSize={[0.42, 0.62, 0.42]} missingLabel={labels.modelMissing} failedLabel={labels.modelFailed} />;
  return <AbstractTrophy award={award} quality={quality} />;
}
