"use client";
import { Component, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { AdaptiveDpr, PerformanceMonitor } from "@react-three/drei";
import { useMuseumStore, type Quality } from "@/stores/museum-store";
import { SceneRoot, type SceneMode, type SceneTexts } from "./scene/SceneRoot";
import type { MuseumSnapshot } from "@/types/museum";

export function detectWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
}

function initialQuality(): Quality {
  if (typeof window === "undefined") return "medium";
  const mobile = window.matchMedia("(max-width: 1023px)").matches || /Mobi|Android/i.test(navigator.userAgent);
  const cores = navigator.hardwareConcurrency ?? 4;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  if (mobile) return mem >= 6 && cores >= 8 ? "medium" : "low";
  return cores >= 6 ? "high" : "medium";
}

class CanvasBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.error("[museum] 3D scene crashed", err);
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

type Props = {
  snapshot: MuseumSnapshot;
  mode: SceneMode;
  texts: SceneTexts;
  orders: Record<string, string[]>;
  onReorder: (generationId: string, order: string[]) => void;
  className?: string;
  showEmptyAnchors?: boolean;
  attempt: number;
};

/**
 * Real-time museum canvas. Renders on demand (no continuous loop), clamps DPR per device, degrades
 * quality when frame rate drops, and reports WebGL failure/context loss to the 2D fallback.
 */
export function MuseumCanvas({ snapshot, mode, texts, orders, onReorder, className, showEmptyAnchors, attempt }: Props) {
  const set = useMuseumStore((s) => s.set);
  const quality = useMuseumStore((s) => s.quality);
  const [ready, setReady] = useState(false);
  const unmounting = useRef(false);
  useEffect(() => {
    unmounting.current = false;
    return () => {
      unmounting.current = true;
    };
  }, []);

  useEffect(() => {
    if (!detectWebGL()) {
      set({ webgl: "unsupported" });
      return;
    }
    set({ webgl: "ok", quality: initialQuality() });
    setReady(true);
  }, [set, attempt]);

  if (!ready) return <div className={className} aria-hidden />;
  const dpr: [number, number] = quality === "high" ? [1, 1.75] : quality === "medium" ? [1, 1.4] : [0.8, 1.1];

  return (
    <div className={className} style={{ touchAction: mode === "mobile-preview" ? "pan-y" : "none" }}>
      <CanvasBoundary onError={() => set({ webgl: "error" })}>
        <Canvas
          key={attempt}
          frameloop="demand"
          dpr={dpr}
          camera={{ fov: mode === "desktop" ? 42 : 50, near: 0.1, far: 60, position: [0, 3, 14] }}
          gl={{ antialias: quality !== "low", powerPreference: "high-performance", alpha: false, stencil: false }}
          onPointerMissed={() => set({ selectedCopyId: null, selectedAwardId: null })}
          onCreated={({ gl }) => {
            const canvas = gl.domElement;
            let timer: ReturnType<typeof setTimeout> | undefined;
            canvas.addEventListener("webglcontextlost", (e) => {
              // R3F deliberately forces a context loss when the canvas unmounts (route change);
              // that is not a failure. Real losses get a grace period for the browser to restore.
              if (unmounting.current || !canvas.isConnected) return;
              e.preventDefault();
              clearTimeout(timer);
              timer = setTimeout(() => {
                if (!unmounting.current && canvas.isConnected) set({ webgl: "lost" });
              }, 2500);
            });
            canvas.addEventListener("webglcontextrestored", () => clearTimeout(timer));
          }}
          aria-label={texts.showcase}
        >
          <PerformanceMonitor
            onDecline={() => set({ quality: quality === "high" ? "medium" : "low" })}
            flipflops={2}
          />
          <AdaptiveDpr pixelated={false} />
          <Suspense fallback={null}>
            <SceneRoot snapshot={snapshot} quality={quality} mode={mode} texts={texts} orders={orders} onReorder={onReorder} showEmptyAnchors={showEmptyAnchors} />
          </Suspense>
        </Canvas>
      </CanvasBoundary>
    </div>
  );
}
