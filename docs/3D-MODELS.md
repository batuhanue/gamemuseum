# 3D model format & placement guide

The museum never ships fake console or figure models. Everything you upload in **/admin/models** is fitted into the scene automatically; until a model exists a labelled abstract placeholder is shown.

## File format
| | Requirement |
|---|---|
| Format | **GLB (binary glTF 2.0)** preferred. `.gltf` only if fully self-contained (buffers/images as `data:` URIs) — external `.bin`/texture references are rejected. |
| Size | ≤ 50 MB hard limit; **aim for ≤ 5 MB** (mobile). Warning above 15 MB. |
| Geometry | ≤ 150k triangles per model (warning above). Consoles: 20–60k is plenty. |
| Compression | Draco and Meshopt are supported (decoders are self-hosted in `/public/draco`). `gltf-transform optimize in.glb out.glb --compress meshopt --texture-compress webp` is a good default. |
| Textures | ≤ 8 textures, ≤ 2048² (1024² for small props), PBR metallic-roughness. |
| Units / axes | Metres, **Y-up**, front facing **+Z**. Wrong units are tolerated (auto-fit), Z-up exports are flagged — use the "Z-up → Y-up" button. |
| Origin | Anywhere — the model is re-centred on X/Z and placed on its base (min Y = 0). |
| Animations / cameras / lights | Ignored. |

## How models are fitted (never modified)
1. The loaded scene is cloned (geometry and materials are shared between clones and cached).
2. Its bounding box is measured; a **uniform** scale fits it into the slot's box (below).
3. It is centred on X/Z and rests on Y = 0 of its plinth/shelf — so it cannot sink or float.
4. Your manifest offsets are applied: `scale` (fine tuning), `positionOffset` (metres), `rotationOffset` (radians, XYZ).

| Category | Fit box W × H × D (m) | Where it appears |
|---|---|---|
| `console` | 1.2 × 0.58 × 0.4 (narrowed to the column) | Console tier above each generation shelf — map with **Generation** (e.g. `ps2`). For PC, a model with Platform family `pc` and no generation is used for all store columns without their own model. |
| `award` | 0.42 × 0.62 × 0.42 | On a pedestal in the glass showcase. Link it to an award in **/admin/awards → 3D model**. |
| `figure`, `controller`, `exhibit` | per anchor (≈0.6–0.7 × 1.1–1.3 × 0.6–0.7) | Pedestal anchors in the hall (`pedestal-left-front`, …) chosen by users in **Customize → Objects**. |
| `furniture`, `decoration` | up to 1.4 × 2.4 × 1.4 | Floor anchors (`floor-left-corner`, …). Centre-back slots are premium. |

Anchors are defined in `src/features/museum/anchors.ts` (position, rotation, fit box, accepted categories).

## Manifest fields (`asset_catalog`)
`name, category, modelUrl, thumbnailUrl, platformFamily, generationId, scale, positionOffset, rotationOffset, anchorType, rarity, isUnlockable, unlockRuleId (award id), premiumSku, status (draft|ready|disabled), analysis, version`.

- **draft** → not visible to users. **ready** → used in museums. **disabled** → hidden; existing user placements stay in the database and render a placeholder (no data loss).
- **Replacing** a file creates a new version (`asset_versions`). User placements reference the asset id, so they keep working. **Roll back** restores any earlier version as a new version.
- **Thumbnails** are captured from the preview canvas on save.
- **Analysis** (stored with each version): triangles, meshes, materials, textures, bounding box and warnings (size, units, Z-up, far origin).

## Recommended workflow
1. Export from Blender: glTF Binary, +Y up, apply transforms, include only selected objects, materials: Export.
2. Optimise with `gltf-transform` (see above).
3. Upload in `/admin/models`, check the preview against the gold wireframe box, adjust offsets, set Generation/anchor, **Save**, then set status **ready**.
