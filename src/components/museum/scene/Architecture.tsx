"use client";
import { memo, useMemo } from "react";
import * as THREE from "three";
import { MeshReflectorMaterial } from "@react-three/drei";
import type { ThemeParams } from "@/lib/db/schema";
import type { Quality } from "@/stores/museum-store";
import { labelTexture } from "./textures";

const box = new THREE.BoxGeometry(1, 1, 1);

/** Hall shell: polished floor, curved back wall, coffered ceiling with light lines, columns and banners. */
export const Architecture = memo(function Architecture({ theme, quality, bannerLeft, bannerRight }: { theme: ThemeParams; quality: Quality; bannerLeft: string; bannerRight: string }) {
  const wall = useMemo(() => new THREE.MeshStandardMaterial({ color: theme.wall, roughness: theme.wallRoughness, metalness: 0.05 }), [theme]);
  const trim = useMemo(() => new THREE.MeshStandardMaterial({ color: theme.trim, roughness: 0.25, metalness: 1 }), [theme]);
  const column = useMemo(() => new THREE.MeshStandardMaterial({ color: theme.shelf, roughness: 0.3, metalness: 0.6 }), [theme]);
  const ceilingLight = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(theme.keyColor).multiplyScalar(1.4), toneMapped: false }), [theme]);
  const bannerMat = (text: string) =>
    labelTexture(text, { w: 1024, h: 128, font: "serif", size: 64, weight: 500, color: "#c9c3b6", tracking: 2 });

  // Curved hall wall behind the galleries
  const backWall = useMemo(() => new THREE.CylinderGeometry(15.5, 15.5, 7.5, 96, 1, true, Math.PI - 1.05, 2.1), []);
  const columns = useMemo(
    () => [
      [-4.35, -5.15, 0.32], [4.35, -5.15, -0.32], [-11.3, -0.75, 0.62], [11.3, -0.75, -0.62],
    ] as [number, number, number][],
    [],
  );

  return (
    <group>
      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 2]}>
        <circleGeometry args={[19, 96]} />
        {quality === "high" ? (
          <MeshReflectorMaterial
            color={theme.floor}
            roughness={theme.floorRoughness}
            metalness={theme.floorMetalness}
            blur={[320, 90]}
            resolution={512}
            mixBlur={1}
            mixStrength={1.4}
            mirror={0.55}
            depthScale={0.8}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.2}
          />
        ) : (
          <meshStandardMaterial color={theme.floor} roughness={Math.max(0.35, theme.floorRoughness)} metalness={theme.floorMetalness} />
        )}
      </mesh>
      {/* inlaid gold ring around the central dais */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 1.55]} material={trim}>
        <ringGeometry args={[3.15, 3.19, 128]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 1.55]} material={trim}>
        <ringGeometry args={[4.4, 4.42, 128]} />
      </mesh>

      <mesh geometry={backWall} material={wall} position={[0, 3.75, 4.2]} />
      {/* ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 7.2, 2]}>
        <circleGeometry args={[19, 64]} />
        <meshStandardMaterial color="#060709" roughness={0.9} />
      </mesh>
      {[-1, 0, 1].map((i) => (
        <mesh key={i} geometry={box} material={ceilingLight} position={[i * 6.2, 7.12, -1.2 + Math.abs(i) * 2.2]} rotation={[0, -i * 0.62, 0]} scale={[5.6, 0.02, 0.06]} />
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 7.1, 1.55]} material={ceilingLight}>
        <ringGeometry args={[3.0, 3.06, 96]} />
      </mesh>

      {columns.map(([x, z, ry], i) => (
        <group key={i} position={[x, 0, z]} rotation={[0, ry, 0]}>
          <mesh geometry={box} material={column} position={[0, 3.6, 0]} scale={[0.62, 7.2, 0.62]} />
          <mesh geometry={box} material={trim} position={[0, 0.12, 0]} scale={[0.7, 0.24, 0.7]} />
          <mesh geometry={box} material={trim} position={[0, 6.95, 0]} scale={[0.7, 0.1, 0.7]} />
          <mesh geometry={box} material={trim} position={[0, 3.6, 0.312]} scale={[0.02, 6.6, 0.01]} />
        </group>
      ))}

      {/* tall banners on the outer walls */}
      {[
        { x: -12.4, z: 2.6, ry: 1.0, text: bannerLeft },
        { x: 12.4, z: 2.6, ry: -1.0, text: bannerRight },
      ].map((b) => (
        <group key={b.x} position={[b.x, 3.4, b.z]} rotation={[0, b.ry, 0]}>
          <mesh geometry={box} position={[0, 0, -0.02]} scale={[1.3, 4.8, 0.04]}>
            <meshStandardMaterial color="#0d1016" roughness={0.8} />
          </mesh>
          <mesh geometry={box} material={trim} position={[0, 2.42, 0]} scale={[1.36, 0.03, 0.06]} />
          <mesh position={[0, 0.9, 0.01]} rotation={[0, 0, -Math.PI / 2]} scale={[3.6, 0.45, 1]}>
            <planeGeometry />
            <meshBasicMaterial map={bannerMat(b.text)} transparent toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
});
