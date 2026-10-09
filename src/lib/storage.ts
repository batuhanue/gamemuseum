import "server-only";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { AppError } from "./errors";
import { newId } from "./ids";

export const MAX_MODEL_BYTES = 50 * 1024 * 1024;
export const MAX_THUMB_BYTES = 2 * 1024 * 1024;

export function blobConfigured() {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

/** Local uploads are a development convenience only; production must use Vercel Blob. */
export function localUploadsAllowed() {
  return !blobConfigured() && process.env.APP_ENV !== "production";
}

export function isTrustedModelUrl(url: string) {
  // Same-origin files: dev uploads in /public/uploads or models shipped in /public/models.
  if (/^\/(uploads\/models|models)\/[\w./-]+\.(glb|gltf)$/.test(url) && !url.includes("..")) return true;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

/** Accepts binary glTF 2.0 (GLB) or a self-contained .gltf whose buffers/images are embedded data URIs. */
export function validateModelBytes(bytes: Uint8Array, fileName: string): "glb" | "gltf" {
  if (bytes.byteLength > MAX_MODEL_BYTES) throw new AppError("invalid", "Model exceeds 50 MB");
  const magic = new TextDecoder().decode(bytes.slice(0, 4));
  if (magic === "glTF") {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (view.getUint32(4, true) !== 2) throw new AppError("invalid", "Only glTF 2.0 is supported");
    return "glb";
  }
  if (fileName.toLowerCase().endsWith(".gltf")) {
    let json: { buffers?: { uri?: string }[]; images?: { uri?: string }[]; asset?: { version?: string } };
    try {
      json = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      throw new AppError("invalid", "Invalid glTF JSON");
    }
    if (json.asset?.version !== "2.0") throw new AppError("invalid", "Only glTF 2.0 is supported");
    const external = [...(json.buffers ?? []), ...(json.images ?? [])].filter((x) => x.uri && !x.uri.startsWith("data:"));
    if (external.length) throw new AppError("invalid", "glTF references external files; export as GLB or embed resources");
    return "gltf";
  }
  throw new AppError("invalid", "Unsupported file type (expected .glb)");
}

export async function saveLocalModel(bytes: Uint8Array, ext: "glb" | "gltf") {
  if (!localUploadsAllowed()) throw new AppError("unavailable", "Configure BLOB_READ_WRITE_TOKEN for uploads");
  const dir = path.resolve("public/uploads/models");
  await mkdir(dir, { recursive: true });
  const name = `${newId("m")}.${ext}`;
  await writeFile(path.join(dir, name), bytes);
  return `/uploads/models/${name}`;
}

export async function saveLocalImage(bytes: Uint8Array, ext: "png" | "webp" | "jpg") {
  if (!localUploadsAllowed()) throw new AppError("unavailable", "Configure BLOB_READ_WRITE_TOKEN for uploads");
  const dir = path.resolve("public/uploads/thumbs");
  await mkdir(dir, { recursive: true });
  const name = `${newId("t")}.${ext}`;
  await writeFile(path.join(dir, name), bytes);
  return `/uploads/thumbs/${name}`;
}

/** After a direct-to-Blob upload, re-check the stored file's header server side. */
export async function verifyRemoteModel(url: string) {
  if (!isTrustedModelUrl(url)) throw new AppError("invalid", "Model URL must point to this project's Blob store");
  if (url.startsWith("/")) return;
  const res = await fetch(url, { headers: { Range: "bytes=0-4095" }, signal: AbortSignal.timeout(10_000) });
  if (!res.ok && res.status !== 206) throw new AppError("invalid", "Uploaded model is not reachable");
  const bytes = new Uint8Array(await res.arrayBuffer());
  const magic = new TextDecoder().decode(bytes.slice(0, 4));
  if (magic !== "glTF" && !url.endsWith(".gltf")) throw new AppError("invalid", "Uploaded file is not a GLB model");
}
