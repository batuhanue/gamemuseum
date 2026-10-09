"use client";
import { Suspense, forwardRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Grid, Lightformer, OrbitControls } from "@react-three/drei";
import type { AssetRef } from "@/types/museum";
import { ModelSlot } from "@/components/museum/scene/ModelAsset";

/** Admin preview: same fitting/offset pipeline as the museum, on a reference plinth with a 1 m grid. */
export const ModelPreview = forwardRef<HTMLCanvasElement, { asset: AssetRef; maxSize: [number, number, number] }>(function ModelPreview({ asset, maxSize }, ref) {
  return (
    <Canvas ref={ref} camera={{ position: [1.6, 1.3, 1.9], fov: 38 }} dpr={[1, 1.5]} gl={{ preserveDrawingBuffer: true }} className="rounded-xl bg-[#0b0d12]">
      <color attach="background" args={["#0b0d12"]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 4, 2]} intensity={1.6} />
      <Environment resolution={64} frames={1}>
        <Lightformer form="rect" intensity={2} position={[0, 4, 2]} scale={[6, 3, 1]} />
      </Environment>
      <Grid args={[4, 4]} cellSize={0.1} sectionSize={1} sectionColor="#d5b477" cellColor="#2a303a" fadeDistance={8} infiniteGrid />
      <mesh position={[0, -0.03, 0]}>
        <boxGeometry args={[maxSize[0] + 0.1, 0.06, maxSize[2] + 0.1]} />
        <meshStandardMaterial color="#1d222a" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, maxSize[1] / 2, 0]}>
        <boxGeometry args={maxSize} />
        <meshBasicMaterial color="#d5b477" wireframe transparent opacity={0.25} />
      </mesh>
      <Suspense fallback={null}>
        <ModelSlot asset={asset} maxSize={maxSize} missingLabel="no model" failedLabel="load failed" />
      </Suspense>
      <OrbitControls makeDefault target={[0, maxSize[1] / 2, 0]} />
    </Canvas>
  );
});
