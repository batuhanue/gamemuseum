"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/client/api";
import type { MuseumSnapshot } from "@/types/museum";
import { useUnlocks } from "@/stores/unlock-store";

const OUTBOX_KEY = "gm:shelf-outbox:v1";

type Pending = { generationId: string; order: string[]; expectedVersion: number; sortBy: string };
type SaveState = "idle" | "saving" | "saved" | "offline" | "conflict" | "error";

function readOutbox(): Record<string, Pending> {
  try {
    return JSON.parse(localStorage.getItem(OUTBOX_KEY) ?? "{}") as Record<string, Pending>;
  } catch {
    return {};
  }
}
function writeOutbox(v: Record<string, Pending>) {
  try {
    if (Object.keys(v).length) localStorage.setItem(OUTBOX_KEY, JSON.stringify(v));
    else localStorage.removeItem(OUTBOX_KEY);
  } catch {
    /* storage unavailable: changes stay in memory until the next successful save */
  }
}

/**
 * Manual shelf ordering with optimistic local order, 700 ms debounced server save and an offline
 * outbox. The server is the source of truth: localStorage only buffers unsent changes, and a
 * version mismatch (edited on another device) refetches instead of overwriting.
 */
export function useShelfLayout(snapshot: MuseumSnapshot, enabled: boolean) {
  const qc = useQueryClient();
  const [orders, setOrders] = useState<Record<string, string[]>>({});
  const [state, setState] = useState<SaveState>("idle");
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pushUnlocks = useUnlocks((s) => s.push);

  const versionOf = useCallback(
    (generationId: string) => snapshot.galleries.flatMap((g) => g.shelves).find((s) => s.generationId === generationId)?.version ?? 0,
    [snapshot],
  );

  const flush = useCallback(
    async (p: Pending) => {
      if (!navigator.onLine) {
        setState("offline");
        return;
      }
      setState("saving");
      try {
        const res = await api<{ version: number; unlocked: { awardId: string }[] }>(`/api/museum/shelves/${p.generationId}`, {
          method: "PUT",
          body: { mode: "manual", sortBy: "custom", order: p.order, expectedVersion: p.expectedVersion },
        });
        const box = readOutbox();
        delete box[p.generationId];
        writeOutbox(box);
        setState("saved");
        if (res.unlocked.length) pushUnlocks(res.unlocked.map((u) => u.awardId));
        await qc.invalidateQueries({ queryKey: ["museum"] });
        setOrders((o) => {
          const { [p.generationId]: _, ...rest } = o;
          return rest;
        });
      } catch (e) {
        if (e instanceof ApiError && e.status === 409) {
          const box = readOutbox();
          delete box[p.generationId];
          writeOutbox(box);
          setState("conflict");
          setOrders((o) => {
            const { [p.generationId]: _, ...rest } = o;
            return rest;
          });
          await qc.invalidateQueries({ queryKey: ["museum"] });
        } else if (e instanceof TypeError) setState("offline");
        else setState("error");
      }
    },
    [qc, pushUnlocks],
  );

  const reorder = useCallback(
    (generationId: string, order: string[]) => {
      if (!enabled) return;
      setOrders((o) => ({ ...o, [generationId]: order }));
      const box = readOutbox();
      const p: Pending = { generationId, order, expectedVersion: box[generationId]?.expectedVersion ?? versionOf(generationId), sortBy: "custom" };
      box[generationId] = p;
      writeOutbox(box);
      clearTimeout(timers.current[generationId]);
      timers.current[generationId] = setTimeout(() => void flush(p), 700);
    },
    [enabled, flush, versionOf],
  );

  // Retry unsent changes on load and when the connection returns.
  useEffect(() => {
    if (!enabled) return;
    const retry = () => {
      const box = readOutbox();
      for (const p of Object.values(box)) {
        setOrders((o) => ({ ...o, [p.generationId]: p.order }));
        void flush(p);
      }
    };
    retry();
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [enabled, flush]);

  return { orders, reorder, saveState: state };
}
