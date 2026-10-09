import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { errorResponse } from "@/lib/http";
import { MAX_MODEL_BYTES } from "@/lib/storage";

/** Issues short-lived client upload tokens for Vercel Blob. Admin only; GLB/glTF/images only; 50 MB cap. */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as HandleUploadBody;
    const res = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        await requireAdmin();
        if (!/^(models|thumbs)\/[\w.-]+\.(glb|gltf|png|webp|jpg)$/i.test(pathname)) throw new Error("Invalid upload path");
        return {
          allowedContentTypes: ["model/gltf-binary", "model/gltf+json", "application/octet-stream", "image/png", "image/webp", "image/jpeg"],
          maximumSizeInBytes: MAX_MODEL_BYTES,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {
        /* metadata is registered by the admin UI via /api/admin/assets after server-side verification */
      },
    });
    return NextResponse.json(res);
  } catch (e) {
    return errorResponse(e);
  }
}
