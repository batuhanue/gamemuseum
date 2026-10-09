"use client";
import { create } from "zustand";

/** Queue of award ids just unlocked by a server response, shown one by one in the unlock modal. */
export const useUnlocks = create<{ queue: string[]; push: (ids: string[]) => void; shift: () => void }>((set) => ({
  queue: [],
  push: (ids) => set((s) => ({ queue: [...s.queue, ...ids.filter((i) => !s.queue.includes(i))] })),
  shift: () => set((s) => ({ queue: s.queue.slice(1) })),
}));
