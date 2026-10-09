import type { Vec3 } from "@/lib/db/schema";

export type AnchorType = "pedestal" | "floor" | "wall" | "shelf";

export type SceneAnchor = {
  id: string;
  type: AnchorType;
  position: Vec3;
  rotationY: number;
  /** Bounding box (w, h, d) a model is normalised into, so nothing sinks into the floor or clips walls. */
  maxSize: Vec3;
  accepts: string[];
  premium?: boolean;
};

/** Named placement slots in the grand hall. Objects can only be placed into these anchors. */
export const SCENE_ANCHORS: SceneAnchor[] = [
  { id: "pedestal-left-front", type: "pedestal", position: [-4.6, 0, 3.4], rotationY: 0.45, maxSize: [0.7, 1.3, 0.7], accepts: ["figure", "console", "controller", "exhibit", "decoration"] },
  { id: "pedestal-right-front", type: "pedestal", position: [4.6, 0, 3.4], rotationY: -0.45, maxSize: [0.7, 1.3, 0.7], accepts: ["figure", "console", "controller", "exhibit", "decoration"] },
  { id: "pedestal-left-mid", type: "pedestal", position: [-3.3, 0, 5.6], rotationY: 0.3, maxSize: [0.6, 1.1, 0.6], accepts: ["figure", "controller", "exhibit", "decoration"] },
  { id: "pedestal-right-mid", type: "pedestal", position: [3.3, 0, 5.6], rotationY: -0.3, maxSize: [0.6, 1.1, 0.6], accepts: ["figure", "controller", "exhibit", "decoration"] },
  { id: "floor-left-corner", type: "floor", position: [-9.2, 0, 1.6], rotationY: 0.9, maxSize: [1.4, 2.4, 1.4], accepts: ["furniture", "decoration", "figure"] },
  { id: "floor-right-corner", type: "floor", position: [9.2, 0, 1.6], rotationY: -0.9, maxSize: [1.4, 2.4, 1.4], accepts: ["furniture", "decoration", "figure"] },
  { id: "floor-center-back-left", type: "floor", position: [-3.9, 0, -4.4], rotationY: 0.2, maxSize: [0.9, 2.0, 0.9], accepts: ["furniture", "decoration"], premium: true },
  { id: "floor-center-back-right", type: "floor", position: [3.9, 0, -4.4], rotationY: -0.2, maxSize: [0.9, 2.0, 0.9], accepts: ["furniture", "decoration"], premium: true },
];

export const anchorById = (id: string) => SCENE_ANCHORS.find((a) => a.id === id);
