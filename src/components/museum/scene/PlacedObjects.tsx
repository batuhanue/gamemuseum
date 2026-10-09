"use client";
import { memo } from "react";
import type { PlacedObject } from "@/types/museum";
import type { ThemeParams } from "@/lib/db/schema";
import { SCENE_ANCHORS } from "@/features/museum/anchors";
import { ModelSlot } from "./ModelAsset";

/** Figures, consoles and decorations placed by the user into named anchors (plinths for pedestal anchors). */
export const PlacedObjects = memo(function PlacedObjects({ objects, theme, labels, showEmptyAnchors }: { objects: PlacedObject[]; theme: ThemeParams; labels: { modelMissing: string; modelFailed: string }; showEmptyAnchors: boolean }) {
  return (
    <group>
      {SCENE_ANCHORS.map((a) => {
        const obj = objects.find((o) => o.anchorId === a.id);
        if (!obj && !showEmptyAnchors) return null;
        const plinthH = a.type === "pedestal" ? 0.9 : 0;
        return (
          <group key={a.id} position={a.position} rotation={[0, a.rotationY + (obj?.rotationY ?? 0), 0]}>
            {a.type === "pedestal" && (
              <>
                <mesh position={[0, plinthH / 2, 0]}>
                  <boxGeometry args={[a.maxSize[0] + 0.12, plinthH, a.maxSize[2] + 0.12]} />
                  <meshStandardMaterial color={theme.shelf} metalness={0.6} roughness={0.32} />
                </mesh>
                <mesh position={[0, plinthH + 0.006, 0]}>
                  <boxGeometry args={[a.maxSize[0] + 0.14, 0.012, a.maxSize[2] + 0.14]} />
                  <meshStandardMaterial color={theme.trim} metalness={1} roughness={0.25} />
                </mesh>
              </>
            )}
            {obj ? (
              <group position={[0, plinthH + 0.012, 0]}>
                <ModelSlot asset={obj.asset} maxSize={a.maxSize} missingLabel={labels.modelMissing} failedLabel={labels.modelFailed} />
              </group>
            ) : (
              <mesh position={[0, plinthH + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.18, 0.2, 48]} />
                <meshBasicMaterial color={theme.trim} transparent opacity={0.6} toneMapped={false} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
});
