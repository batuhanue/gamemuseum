"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { ViewerInfo } from "@/services/viewer";

const Ctx = createContext<ViewerInfo | null>(null);
export const ViewerProvider = ({ viewer, children }: { viewer: ViewerInfo | null; children: ReactNode }) => <Ctx.Provider value={viewer}>{children}</Ctx.Provider>;
export const useViewer = () => useContext(Ctx);
