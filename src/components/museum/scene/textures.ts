"use client";
import * as THREE from "three";

const cache = new Map<string, THREE.Texture>();
const MAX_CACHE = 400;

function remember(key: string, tex: THREE.Texture) {
  if (cache.size >= MAX_CACHE) {
    const first = cache.keys().next().value as string;
    cache.get(first)?.dispose();
    cache.delete(first);
  }
  cache.set(key, tex);
  return tex;
}

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
}

const SERIF = '"Cormorant Garamond", Georgia, serif';
const SANS = 'Inter, "Helvetica Neue", Arial, sans-serif';

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(next).width > maxWidth && cur) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 4);
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * Procedural front cover for games without catalog art (demo/manual). It is plainly a typographic
 * placeholder, never presented as the original box art.
 */
export function proceduralCover(title: string, palette: [string, string] | undefined, aspect: number, demo: boolean) {
  const key = `pc:${title}:${palette?.join()}:${aspect.toFixed(3)}:${demo}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const h = 512;
  const w = Math.round(h * aspect);
  const [c, ctx] = canvas(w, h);
  const seed = hash(title);
  const [a, b] = palette ?? [`hsl(${seed % 360} 35% 14%)`, `hsl(${(seed >> 8) % 360} 45% 52%)`];
  const g = ctx.createLinearGradient(0, 0, w * 0.3, h);
  g.addColorStop(0, b);
  g.addColorStop(0.55, a);
  g.addColorStop(1, "#050506");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // Abstract horizon motif
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = b;
  ctx.beginPath();
  ctx.arc(w * (0.3 + ((seed >> 4) % 40) / 100), h * 0.42, w * 0.32, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = "#07080a";
  ctx.beginPath();
  ctx.moveTo(0, h * 0.7);
  for (let x = 0; x <= w; x += w / 8) ctx.lineTo(x, h * (0.6 + (((seed >> (x % 13)) % 20) / 100)));
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#f2eee5";
  ctx.font = `600 ${Math.round(w * 0.13)}px ${SERIF}`;
  ctx.textAlign = "center";
  const lines = wrap(ctx, title.toUpperCase(), w * 0.86);
  lines.forEach((l, i) => ctx.fillText(l, w / 2, h * 0.16 + i * w * 0.14));
  if (demo) {
    ctx.font = `600 ${Math.round(w * 0.055)}px ${SANS}`;
    ctx.fillStyle = "rgba(213,180,119,0.95)";
    ctx.fillText("DEMO CATALOG", w / 2, h * 0.94);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return remember(key, tex);
}

export function labelTexture(text: string, opts: { w?: number; h?: number; font?: "serif" | "sans"; size?: number; color?: string; bg?: string; weight?: number; tracking?: number; align?: CanvasTextAlign } = {}) {
  const key = `lb:${text}:${JSON.stringify(opts)}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const w = opts.w ?? 1024;
  const h = opts.h ?? 192;
  const [c, ctx] = canvas(w, h);
  if (opts.bg) {
    ctx.fillStyle = opts.bg;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.fillStyle = opts.color ?? "#f2eee5";
  ctx.font = `${opts.weight ?? 500} ${opts.size ?? Math.round(h * 0.55)}px ${opts.font === "sans" ? SANS : SERIF}`;
  ctx.textAlign = opts.align ?? "center";
  ctx.textBaseline = "middle";
  const spaced = opts.tracking ? text.split("").join(" ".repeat(opts.tracking)) : text;
  const x = opts.align === "left" ? h * 0.1 : opts.align === "right" ? w - h * 0.1 : w / 2;
  ctx.fillText(spaced, x, h / 2, w * 0.96);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return remember(key, tex);
}

/** Two-line plate: big title + small caption (generation name and years). */
export function plateTexture(title: string, caption: string | null, accent: string) {
  const key = `pl:${title}:${caption}:${accent}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const [c, ctx] = canvas(512, 160);
  ctx.fillStyle = "#0b0c0f";
  ctx.fillRect(0, 0, 512, 160);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 154, 512, 6);
  ctx.textAlign = "center";
  ctx.fillStyle = "#f2eee5";
  ctx.font = `600 64px ${SANS}`;
  ctx.fillText(title.toUpperCase(), 256, caption ? 78 : 100, 490);
  if (caption) {
    ctx.fillStyle = "#89919d";
    ctx.font = `500 34px ${SANS}`;
    ctx.fillText(caption, 256, 128, 490);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return remember(key, tex);
}

/** Top banner printed on many console cases (generic, text-only, no platform logos). */
export function bandTexture(text: string, bg: string, fg: string) {
  const key = `bd:${text}:${bg}:${fg}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const [c, ctx] = canvas(512, 48);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 48);
  ctx.fillStyle = fg;
  ctx.font = `700 30px ${SANS}`;
  ctx.textBaseline = "middle";
  ctx.fillText(text, 16, 25);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return remember(key, tex);
}

/* ── Remote covers ── */

const loader = new THREE.TextureLoader();
const pending = new Map<string, Promise<THREE.Texture>>();
let active = 0;
const queue: (() => void)[] = [];
const MAX_PARALLEL = 6;

function schedule<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const run = () => {
      active++;
      fn().then(resolve, reject).finally(() => {
        active--;
        queue.shift()?.();
      });
    };
    if (active < MAX_PARALLEL) run();
    else queue.push(run);
  });
}

export function coverProxyUrl(url: string) {
  return url.startsWith("https://images.igdb.com/") ? `/api/cover?u=${encodeURIComponent(url)}` : url;
}

export function loadCover(url: string): Promise<THREE.Texture> {
  const key = `cv:${url}`;
  const hit = cache.get(key);
  if (hit) return Promise.resolve(hit);
  const p = pending.get(key);
  if (p) return p;
  const promise = schedule(
    () =>
      new Promise<THREE.Texture>((resolve, reject) => {
        loader.load(
          coverProxyUrl(url),
          (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.anisotropy = 4;
            resolve(remember(key, tex));
          },
          undefined,
          reject,
        );
      }),
  ).finally(() => pending.delete(key));
  pending.set(key, promise);
  return promise;
}
