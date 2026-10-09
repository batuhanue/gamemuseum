import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(24)
  .regex(/^[a-zA-Z0-9_.]+$/, "Only letters, numbers, dot and underscore");

export const passwordSchema = z.string().min(8).max(200);

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  username: usernameSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(200),
});

export const ownershipTypes = ["physical", "digital"] as const;
export const stores = ["steam", "epic", "gog", "other"] as const;
export const conditions = ["sealed", "complete", "loose", "custom"] as const;
export const statuses = ["backlog", "playing", "completed", "paused", "dropped"] as const;

export const addGameSchema = z.object({
  catalogGameId: z.string().min(1).max(100),
  generationId: z.string().min(1).max(50),
  ownershipType: z.enum(ownershipTypes),
  store: z.enum(stores).optional(),
  edition: z.string().trim().max(120).optional(),
  region: z.string().trim().max(40).optional(),
  condition: z.enum(conditions).optional(),
  purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  purchasePrice: z.number().nonnegative().max(1_000_000).optional(),
  purchaseCurrency: z.string().length(3).toUpperCase().optional(),
  status: z.enum(statuses).default("backlog"),
  isFavorite: z.boolean().default(false),
  rating: z.number().min(0).max(10).optional(),
  notes: z.string().max(4000).optional(),
});
export type AddGameInput = z.infer<typeof addGameSchema>;

export const updateGameSchema = z
  .object({
    generationId: z.string().min(1).max(50),
    ownershipType: z.enum(ownershipTypes),
    store: z.enum(stores).nullable(),
    edition: z.string().trim().max(120).nullable(),
    region: z.string().trim().max(40).nullable(),
    condition: z.enum(conditions).nullable(),
    purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    purchasePrice: z.number().nonnegative().max(1_000_000).nullable(),
    purchaseCurrency: z.string().length(3).toUpperCase().nullable(),
    status: z.enum(statuses),
    isFavorite: z.boolean(),
    isPublic: z.boolean(),
    rating: z.number().min(0).max(10).nullable(),
    notes: z.string().max(4000).nullable(),
    expectedVersion: z.number().int().positive(),
  })
  .partial()
  .required({ expectedVersion: true });
export type UpdateGameInput = z.infer<typeof updateGameSchema>;

export const sortRules = ["alphabetical", "release", "added", "generation", "status", "favorites", "series", "ownership", "custom"] as const;
export type SortRule = (typeof sortRules)[number];

export const shelfUpdateSchema = z.object({
  mode: z.enum(["auto", "manual"]),
  sortBy: z.enum(sortRules),
  order: z.array(z.string().max(100)).max(5000).optional(),
  expectedVersion: z.number().int().nonnegative(),
});
