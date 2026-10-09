import { route, json } from "@/lib/http";
import { requireAdmin } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { MAX_THUMB_BYTES, saveLocalImage, saveLocalModel, validateModelBytes } from "@/lib/storage";

/** Development-only upload target used when Vercel Blob is not configured. */
export const POST = route(async (req) => {
  await requireAdmin();
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new AppError("invalid", "file missing");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (form.get("kind") === "thumb") {
    if (bytes.byteLength > MAX_THUMB_BYTES) throw new AppError("invalid", "Thumbnail too large");
    const ext = file.type === "image/webp" ? "webp" : file.type === "image/jpeg" ? "jpg" : "png";
    return json({ url: await saveLocalImage(bytes, ext) });
  }
  const kind = validateModelBytes(bytes, file.name);
  return json({ url: await saveLocalModel(bytes, kind), size: bytes.byteLength });
});
