"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as D from "@radix-ui/react-dialog";
import { useRef } from "react";
import type * as THREE from "three";
import { useUnlocks } from "@/stores/unlock-store";
import { api } from "@/lib/client/api";
import type { AwardView, MuseumSnapshot } from "@/types/museum";
import { TrophyModel } from "@/components/museum/scene/Trophy";
import { Button } from "@/components/ui/button";
import { detectWebGL } from "@/components/museum/MuseumCanvas";
import { useViewer } from "@/components/shell/ViewerContext";

function Spin({ award, reduce }: { award: AwardView; reduce: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current && !reduce) ref.current.rotation.y += dt * 0.9;
  });
  return (
    <group ref={ref} position={[0, -0.25, 0]} scale={1.6}>
      <TrophyModel award={award} quality="medium" labels={{ modelMissing: "", modelFailed: "" }} />
    </group>
  );
}

/** Award unlock moment: short gold flash, 3D trophy, title/description and a real "place in showcase" action. */
export function UnlockModal() {
  const t = useTranslations();
  const router = useRouter();
  const qc = useQueryClient();
  const viewer = useViewer();
  const queue = useUnlocks((s) => s.queue);
  const shift = useUnlocks((s) => s.shift);
  const current = queue[0];
  const { data } = useQuery({ queryKey: ["museum"], queryFn: () => api<{ snapshot: MuseumSnapshot }>("/api/museum"), enabled: !!current && !!viewer });
  const [busy, setBusy] = useState(false);
  const [reduce, setReduce] = useState(false);
  const [webgl, setWebgl] = useState(true);
  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setWebgl(detectWebGL());
  }, []);
  useEffect(() => {
    if (current) void qc.invalidateQueries({ queryKey: ["museum"] });
  }, [current, qc]);

  const award = data?.snapshot.awards.find((a) => a.id === current);
  if (!current || !award) return null;
  const displayed = !!award.earned?.displayed;

  const close = () => {
    shift();
    router.refresh();
  };

  return (
    <D.Root open onOpenChange={(o) => !o && close()}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-[80] bg-black/75" />
        {!reduce && <div className="gm-flash pointer-events-none fixed inset-0 z-[81]" aria-hidden />}
        <D.Content className="panel fixed left-1/2 top-1/2 z-[82] w-[min(92vw,440px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden p-0 text-center">
          <div className="h-56 bg-[radial-gradient(circle_at_50%_60%,#2a2215,#0b0c0f_70%)]">
            {webgl && (
              <Canvas camera={{ position: [0, 0.4, 1.9], fov: 38 }} dpr={[1, 1.5]} frameloop={reduce ? "demand" : "always"}>
                <ambientLight intensity={0.5} />
                <directionalLight position={[2, 3, 2]} intensity={2} />
                <Environment resolution={64} frames={1}>
                  <Lightformer form="rect" intensity={3} color="#ffe2b0" position={[0, 3, 2]} scale={[6, 2, 1]} />
                  <Lightformer form="ring" intensity={1.5} color="#d5b477" position={[-3, 1, 1]} scale={2} />
                </Environment>
                <Suspense fallback={null}>
                  <Spin award={award} reduce={reduce} />
                </Suspense>
              </Canvas>
            )}
          </div>
          <div className="p-6">
            <div className="eyebrow text-gold">{t("awards.unlockedTitle")}</div>
            <D.Title className="display mt-2 text-3xl">{award.title}</D.Title>
            <D.Description className="mt-2 text-sm text-slate">{award.description}</D.Description>
            <div className="mt-1 text-xs text-gold-dim">{t(`awards.${award.rarity}`)} · {t("awards.points", { points: award.points })}</div>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button
                variant="primary"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    if (!displayed) await api(`/api/awards/${award.id}`, { method: "PATCH", body: { displayed: true } });
                    await qc.invalidateQueries({ queryKey: ["museum"] });
                    shift();
                    router.push(`/museum/awards?award=${award.id}`);
                  } catch {
                    router.push(`/museum/awards?award=${award.id}`);
                    shift();
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {displayed ? t("awards.seeInShowcase") : t("awards.placeInShowcase")}
              </Button>
              <Button variant="ghost" onClick={close}>{t("common.close")}</Button>
            </div>
          </div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
