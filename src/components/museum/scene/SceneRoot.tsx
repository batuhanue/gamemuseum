"use client";
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { MuseumSnapshot } from "@/types/museum";
import { useMuseumStore, type Quality } from "@/stores/museum-store";
import { Architecture } from "./Architecture";
import { LightingRig } from "./Lighting";
import { PlatformGallery, type SceneLabels } from "./Gallery";
import { AwardShowcase } from "./AwardShowcase";
import { PlacedObjects } from "./PlacedObjects";
import { CameraRig } from "./CameraRig";

export type SceneMode = "desktop" | "mobile-preview" | "mobile-explore" | "mobile-shelf" | "static";

export type SceneTexts = SceneLabels & { showcase: string; bannerLeft: string; bannerRight: string };

type Props = {
  snapshot: MuseumSnapshot;
  quality: Quality;
  mode: SceneMode;
  texts: SceneTexts;
  orders: Record<string, string[]>;
  onReorder: (generationId: string, order: string[]) => void;
  showEmptyAnchors?: boolean;
};

export function SceneRoot({ snapshot, quality, mode, texts, orders, onReorder, showEmptyAnchors = false }: Props) {
  const previewTheme = useMuseumStore((s) => s.previewTheme);
  const theme = previewTheme ?? snapshot.theme;
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const invalidate = useThree((s) => s.invalidate);
  const interactive = mode === "desktop" || mode === "mobile-explore" || mode === "mobile-shelf";

  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = theme.exposure;
    scene.fog = new THREE.FogExp2(theme.fog, theme.fogDensity * (mode === "desktop" ? 1 : 0.8));
    scene.background = new THREE.Color(theme.fog);
    invalidate();
  }, [gl, scene, theme, mode, invalidate]);

  const accents = Object.fromEntries(snapshot.galleries.map((g) => [g.platformId, g.accent]));

  return (
    <>
      <LightingRig theme={theme} quality={quality} accents={accents} />
      <Architecture theme={theme} quality={quality} bannerLeft={texts.bannerLeft} bannerRight={texts.bannerRight} />
      {snapshot.galleries.map((g) => (
        <PlatformGallery key={g.platformId} gallery={g} theme={theme} interactive={interactive} labels={texts} orders={orders} onReorder={onReorder} />
      ))}
      <AwardShowcase awards={snapshot.awards} theme={theme} quality={quality} labels={texts} interactive={interactive} />
      <PlacedObjects objects={snapshot.objects} theme={theme} labels={texts} showEmptyAnchors={showEmptyAnchors} />
      <CameraRig theme={theme} mode={mode} galleries={snapshot.galleries} />
    </>
  );
}
