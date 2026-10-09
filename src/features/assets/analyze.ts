"use client";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

export type ModelAnalysis = {
  fileSize?: number;
  triangles: number;
  meshes: number;
  materials: number;
  textures: number;
  bbox: { min: [number, number, number]; max: [number, number, number] };
  warnings: string[];
};

const LIMITS = { triangles: 150_000, textures: 8, fileSize: 15 * 1024 * 1024, maxDim: 50, minDim: 0.005 };

/**
 * Inspects an uploaded model without modifying it: bounding box, origin, up-axis heuristics,
 * geometry/texture budgets. Results are stored as metadata and shown to the admin as warnings.
 */
export async function analyzeModel(url: string, fileSize?: number): Promise<ModelAnalysis> {
  const loader = new GLTFLoader();
  const draco = new DRACOLoader();
  draco.setDecoderPath("/draco/");
  loader.setDRACOLoader(draco);
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(url);
  let triangles = 0;
  let meshes = 0;
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  gltf.scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    meshes++;
    const g = m.geometry;
    triangles += g.index ? g.index.count / 3 : (g.attributes.position?.count ?? 0) / 3;
    for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
      materials.add(mat);
      for (const v of Object.values(mat)) if ((v as THREE.Texture)?.isTexture) textures.add(v as THREE.Texture);
    }
  });
  const box = new THREE.Box3().setFromObject(gltf.scene);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const warnings: string[] = [];
  if (triangles > LIMITS.triangles) warnings.push(`High triangle count (${Math.round(triangles).toLocaleString()} > ${LIMITS.triangles.toLocaleString()}) — consider decimation or Meshopt/Draco.`);
  if (textures.size > LIMITS.textures) warnings.push(`Many textures (${textures.size}) — consider atlasing / KTX2.`);
  if (fileSize && fileSize > LIMITS.fileSize) warnings.push(`Large file (${(fileSize / 1048576).toFixed(1)} MB) — slow on mobile.`);
  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim > LIMITS.maxDim) warnings.push(`Very large units (max ${maxDim.toFixed(1)}) — likely centimetres; auto-fit will scale it.`);
  if (maxDim < LIMITS.minDim) warnings.push("Extremely small model — check export units.");
  if (size.z > size.y * 2.5 && size.z > size.x * 1.2) warnings.push("Model is much deeper than tall — it may be Z-up; adjust rotation X by -90°.");
  if (center.length() > maxDim * 2) warnings.push("Origin is far from the geometry — auto-centering will be applied.");
  draco.dispose();
  return {
    fileSize,
    triangles: Math.round(triangles),
    meshes,
    materials: materials.size,
    textures: textures.size,
    bbox: { min: box.min.toArray() as [number, number, number], max: box.max.toArray() as [number, number, number] },
    warnings,
  };
}
