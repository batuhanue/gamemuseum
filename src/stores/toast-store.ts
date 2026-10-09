"use client";
import { create } from "zustand";

export type Toast = { id: number; kind: "info" | "success" | "error"; text: string };
let n = 0;

export const useToasts = create<{ toasts: Toast[]; show: (text: string, kind?: Toast["kind"]) => void; dismiss: (id: number) => void }>((set) => ({
  toasts: [],
  show: (text, kind = "info") => {
    const id = ++n;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, kind, text }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4500);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
