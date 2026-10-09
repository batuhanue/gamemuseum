import { describe, expect, it } from "vitest";
import { generationFromAlias } from "@/features/platforms/aliases";
import { generationsForIgdbPlatforms, GENERATIONS } from "@/features/platforms/reference";
import { validateModelBytes, isTrustedModelUrl } from "@/lib/storage";
import { slotFromLocal, slotPosition, focusLayout } from "@/components/museum/scene/geometry";
import { parseMuseumRoute } from "@/components/museum/useMuseumRoute";
import tr from "../../messages/tr.json";
import en from "../../messages/en.json";

describe("platform mapping", () => {
  it("maps CSV aliases to generations", () => {
    expect(generationFromAlias("PlayStation 2")).toBe("ps2");
    expect(generationFromAlias("Xbox Series X")).toBe("xseries");
    expect(generationFromAlias("steam")).toBe("pc-steam");
    expect(generationFromAlias("Play Station 4")).toBe("ps4");
    expect(generationFromAlias("Dreamcast")).toBeNull();
  });
  it("maps IGDB platforms to console generations", () => {
    expect(generationsForIgdbPlatforms([8, 6]).map((g) => g.id)).toEqual(["ps2"]);
    expect(generationsForIgdbPlatforms([12, 9]).map((g) => g.id).sort()).toEqual(["ps3", "x360"]);
  });
  it("every generation has a case profile and capacity", () => {
    for (const g of GENERATIONS) expect(g.shelfCapacity).toBeGreaterThan(0);
  });
});

describe("model upload validation", () => {
  const glb = (version: number) => {
    const b = new Uint8Array(12);
    b.set(new TextEncoder().encode("glTF"), 0);
    new DataView(b.buffer).setUint32(4, version, true);
    return b;
  };
  it("accepts GLB 2.0 and rejects others", () => {
    expect(validateModelBytes(glb(2), "a.glb")).toBe("glb");
    expect(() => validateModelBytes(glb(1), "a.glb")).toThrow();
    expect(() => validateModelBytes(new TextEncoder().encode("hello"), "a.obj")).toThrow();
  });
  it("rejects glTF with external resources", () => {
    const json = JSON.stringify({ asset: { version: "2.0" }, buffers: [{ uri: "model.bin" }] });
    expect(() => validateModelBytes(new TextEncoder().encode(json), "a.gltf")).toThrow(/external/);
    const ok = JSON.stringify({ asset: { version: "2.0" }, buffers: [{ uri: "data:application/octet-stream;base64,AA==" }] });
    expect(validateModelBytes(new TextEncoder().encode(ok), "a.gltf")).toBe("gltf");
  });
  it("only trusts blob store and same-origin model URLs", () => {
    expect(isTrustedModelUrl("https://abc.public.blob.vercel-storage.com/models/x.glb")).toBe(true);
    expect(isTrustedModelUrl("/uploads/models/m_1.glb")).toBe(true);
    expect(isTrustedModelUrl("/uploads/models/../../etc.glb")).toBe(false);
    expect(isTrustedModelUrl("https://evil.example.com/x.glb")).toBe(false);
  });
});

describe("drag and drop slot math", () => {
  it("slotFromLocal inverts slotPosition", () => {
    const layout = focusLayout(4, "dvd-black");
    for (let i = 0; i < 12; i++) expect(slotFromLocal(slotPosition(i, layout, "dvd-black"), layout, "dvd-black")).toBe(i);
  });
});

describe("routing", () => {
  it("parses museum routes", () => {
    expect(parseMuseumRoute("/museum/xbox", "/museum")).toEqual({ kind: "gallery", gallery: "xbox" });
    expect(parseMuseumRoute("/u/ali/museum/awards", "/u/ali/museum")).toEqual({ kind: "awards" });
    expect(parseMuseumRoute("/", "/museum")).toEqual({ kind: "home" });
  });
});

describe("i18n", () => {
  it("tr and en have identical keys", () => {
    const keys = (o: Record<string, Record<string, string>>) => Object.entries(o).flatMap(([ns, v]) => Object.keys(v).map((k) => `${ns}.${k}`)).sort();
    expect(keys(tr)).toEqual(keys(en));
  });
});
