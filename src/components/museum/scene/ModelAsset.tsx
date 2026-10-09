"use client";
import { Component, Suspense, useMemo, type ReactNode } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import type { AssetRef } from "@/types/museum";
import { labelTexture } from "./textures";

const DRACO_PATH = "/draco/";

/**
 * Fits an uploaded model into the anchor box without altering its geometry: uniform scale to the
 * box, centred on X/Z, resting on Y=0 (so nothing sinks into a plinth or floats). Admin offsets
 * from the manifest are applied afterwards. Geometry and materials are shared between clones.
 */
function FittedModel({ asset, maxSize }: { asset: AssetRef; maxSize: [number, number, number] }) {
  const gltf = useGLTF(asset.modelUrl!, DRACO_PATH);
  const object = useMemo(() => {
    const clone = gltf.scene.clone(true);
    clone.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = false;
        m.receiveShadow = false;
      }
    });
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const fit = Math.min(maxSize[0] / Math.max(size.x, 1e-4), maxSize[1] / Math.max(size.y, 1e-4), maxSize[2] / Math.max(size.z, 1e-4));
    const center = box.getCenter(new THREE.Vector3());
    const wrapper = new THREE.Group();
    clone.position.set(-center.x, -box.min.y, -center.z);
    wrapper.add(clone);
    wrapper.scale.setScalar(fit);
    return wrapper;
  }, [gltf.scene, maxSize]);
  return (
    <group position={asset.positionOffset} rotation={asset.rotationOffset} scale={asset.scale}>
      <primitive object={object} />
    </group>
  );
}

const placeholderBox = new THREE.BoxGeometry(1, 1, 1);
const placeholderMat = new THREE.MeshStandardMaterial({ color: "#2a2f37", roughness: 0.35, metalness: 0.7 });
const placeholderEdge = new THREE.MeshStandardMaterial({ color: "#d5b477", roughness: 0.3, metalness: 0.9, emissive: "#3a2e18" });

/** Unbranded geometric stand-in, clearly labelled. Never a fake console or figure. */
export function ModelPlaceholder({ maxSize, label }: { maxSize: [number, number, number]; label: string }) {
  const tex = useMemo(() => labelTexture(label, { w: 768, h: 96, font: "sans", size: 40, color: "#89919d", weight: 500 }), [label]);
  const s = Math.min(maxSize[0], maxSize[2]) * 0.62;
  const hgt = maxSize[1] * 0.42;
  return (
    <group>
      <mesh geometry={placeholderBox} material={placeholderMat} position={[0, hgt / 2, 0]} scale={[s, hgt, s * 0.7]} />
      <mesh geometry={placeholderBox} material={placeholderEdge} position={[0, hgt + 0.006, 0]} scale={[s * 1.02, 0.012, s * 0.72]} />
      <mesh position={[0, hgt + 0.09, s * 0.36]}>
        <planeGeometry args={[s * 1.6, s * 0.2]} />
        <meshBasicMaterial map={tex} transparent toneMapped={false} />
      </mesh>
    </group>
  );
}

class ModelBoundary extends Component<{ fallback: ReactNode; children: ReactNode; resetKey: string }, { failed: boolean; key: string }> {
  state = { failed: false, key: this.props.resetKey };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  static getDerivedStateFromProps(p: { resetKey: string }, s: { failed: boolean; key: string }) {
    return p.resetKey !== s.key ? { failed: false, key: p.resetKey } : null;
  }
  componentDidCatch(err: unknown) {
    console.warn("[museum] model failed to load", err);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Renders the asset's GLB when present and ready, otherwise (or on load failure) the labelled placeholder. */
export function ModelSlot({ asset, maxSize, missingLabel, failedLabel }: { asset: AssetRef | null; maxSize: [number, number, number]; missingLabel: string; failedLabel: string }) {
  if (!asset?.modelUrl || asset.status !== "ready") return <ModelPlaceholder maxSize={maxSize} label={missingLabel} />;
  return (
    <ModelBoundary resetKey={`${asset.id}:${asset.version}`} fallback={<ModelPlaceholder maxSize={maxSize} label={failedLabel} />}>
      <Suspense fallback={<ModelPlaceholder maxSize={maxSize} label="…" />}>
        <FittedModel asset={asset} maxSize={maxSize} />
      </Suspense>
    </ModelBoundary>
  );
}
