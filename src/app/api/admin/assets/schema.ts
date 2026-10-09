import { z } from "zod";

const vec3 = z.tuple([z.number(), z.number(), z.number()]);
export const assetSchema = z.object({
  name: z.string().trim().min(1).max(120),
  category: z.enum(["console", "controller", "figure", "award", "furniture", "decoration", "exhibit"]),
  modelUrl: z.string().max(1000).nullable().optional(),
  thumbnailUrl: z.string().max(1000).nullable().optional(),
  platformFamily: z.string().max(40).nullable().optional(),
  generationId: z.string().max(50).nullable().optional(),
  scale: vec3.refine((v) => v.every((x) => x > 0 && x < 100), "scale out of range").optional(),
  positionOffset: vec3.refine((v) => v.every((x) => Math.abs(x) < 10), "offset out of range").optional(),
  rotationOffset: vec3.refine((v) => v.every((x) => Math.abs(x) <= Math.PI * 2), "rotation out of range").optional(),
  anchorType: z.enum(["shelf", "pedestal", "floor", "wall"]).optional(),
  rarity: z.string().max(20).nullable().optional(),
  isUnlockable: z.boolean().optional(),
  unlockRuleId: z.string().max(80).nullable().optional(),
  premiumSku: z.string().max(80).nullable().optional(),
  status: z.enum(["draft", "ready", "disabled"]).optional(),
  analysis: z
    .object({
      fileSize: z.number().optional(), triangles: z.number().optional(), meshes: z.number().optional(), materials: z.number().optional(),
      textures: z.number().optional(), bbox: z.object({ min: vec3, max: vec3 }).optional(), warnings: z.array(z.string().max(200)).max(20).optional(),
    })
    .nullable()
    .optional(),
});
