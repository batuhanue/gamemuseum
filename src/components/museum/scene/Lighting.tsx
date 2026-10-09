"use client";
import { memo, useMemo } from "react";
import * as THREE from "three";
import { Environment, Lightformer } from "@react-three/drei";
import type { JSX } from "react";
import type { ThemeParams } from "@/lib/db/schema";
import type { Quality } from "@/stores/museum-store";
import { GALLERY_TRANSFORMS } from "./geometry";

/**
 * Fixed light budget (no lights added/removed at runtime to avoid shader recompiles):
 * hemisphere + ambient, one key directional, three gallery spots and one showcase spot.
 * Reflections come from a locally rendered Lightformer environment (no HDR downloads).
 */
export const LightingRig = memo(function LightingRig({ theme, quality, accents }: { theme: ThemeParams; quality: Quality; accents: Record<string, string> }) {
  return (
    <>
      <ambientLight intensity={theme.ambient * 0.6} color={theme.ambientColor} />
      <hemisphereLight intensity={theme.ambient * 0.7} color={theme.ambientColor} groundColor="#050506" />
      <directionalLight position={[2, 9, 9]} intensity={theme.keyLight * 0.9} color={theme.keyColor} />
      {(Object.keys(GALLERY_TRANSFORMS) as (keyof typeof GALLERY_TRANSFORMS)[]).map((k) => {
        const t = GALLERY_TRANSFORMS[k];
        const nx = Math.sin(t.rotationY);
        const nz = Math.cos(t.rotationY);
        return (
          <Spot
            key={k}
            position={[t.position[0] + nx * 4.2, 6.6, t.position[2] + nz * 4.2]}
            target={[t.position[0], 2.0, t.position[2]]}
            angle={0.72}
            penumbra={0.85}
            intensity={theme.keyLight * 38}
            distance={14}
            decay={1.6}
            color={accents[k] ? mix(theme.keyColor, accents[k]!, 0.12) : theme.keyColor}
          />
        );
      })}
      <Spot position={[0, 6.8, 4.2]} target={[0, 0.8, 1.2]} angle={0.55} penumbra={0.9} intensity={theme.keyLight * 30} distance={12} decay={1.6} color="#ffe6c0" />
      <Environment resolution={quality === "low" ? 64 : 256} frames={1}>
        <Lightformer form="rect" intensity={2.2} color={theme.keyColor} position={[0, 6, 2]} rotation-x={Math.PI / 2} scale={[14, 3, 1]} />
        <Lightformer form="rect" intensity={0.8} color={theme.ledColor} position={[-8, 3, 2]} rotation-y={Math.PI / 2} scale={[8, 2, 1]} />
        <Lightformer form="rect" intensity={0.8} color={theme.ledColor} position={[8, 3, 2]} rotation-y={-Math.PI / 2} scale={[8, 2, 1]} />
        <Lightformer form="ring" intensity={1.2} color={theme.trim} position={[0, 4, -8]} scale={4} />
      </Environment>
    </>
  );
});

function mix(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, "0")}`;
}

type SpotProps = { position: [number, number, number]; target: [number, number, number] } & Omit<JSX.IntrinsicElements["spotLight"], "position" | "target">;

/** Spot light whose target object is part of the scene graph so its world matrix stays valid. */
function Spot({ position, target, ...props }: SpotProps) {
  const [tx, ty, tz] = target;
  const obj = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(tx, ty, tz);
    return o;
  }, [tx, ty, tz]);
  return (
    <>
      <primitive object={obj} />
      <spotLight position={position} target={obj} {...props} />
    </>
  );
}
