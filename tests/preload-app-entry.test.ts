import { describe, expect, test } from "bun:test";
import { preloadAppEntry } from "../vite.config";

type Tag = { tag: string; attrs: Record<string, unknown>; injectTo: string };

const chunk = (fileName: string, extra: Record<string, unknown> = {}) =>
  ({ type: "chunk", fileName, imports: [], isEntry: false, facadeModuleId: null, viteMetadata: { importedCss: new Set() }, ...extra });
const asset = (fileName: string) => ({ type: "asset", fileName });

function tags(bundle: Record<string, unknown> | undefined, base = "./") {
  const plugin = preloadAppEntry();
  (plugin.configResolved as (config: { base: string }) => void)({ base });
  return (plugin.transformIndexHtml as (html: string, ctx: { bundle?: unknown }) => Tag[])("", { bundle });
}

const bundle = Object.fromEntries([
  chunk("assets/index-a.js", { isEntry: true, imports: ["assets/helper-b.js"], facadeModuleId: "/repo/src/main.ts" }),
  chunk("assets/helper-b.js"),
  chunk("assets/App-c.js", { imports: ["assets/helper-b.js", "assets/data-d.js"], facadeModuleId: "/repo/src/App.svelte", viteMetadata: { importedCss: new Set(["assets/App-e.css"]) } }),
  chunk("assets/data-d.js"),
  chunk("assets/pdf-f.js", { facadeModuleId: "/repo/src/lib/sheet-pdf.ts" }),
  asset("assets/cinzel-latin-wght-normal-g.woff2"),
  asset("assets/eb-garamond-latin-wght-normal-h.woff2"),
  asset("assets/eb-garamond-latin-wght-italic-i.woff2"),
  asset("assets/eb-garamond-cyrillic-wght-normal-j.woff2"),
].map(item => [item.fileName, item]));

describe("preload app entry", () => {
  test("does nothing without a bundle (dev server)", () => {
    expect(tags(undefined)).toEqual([]);
  });

  test("preloads the lazily imported app, its imports, its CSS and the upright Latin fonts", () => {
    const links = tags(bundle).map(tag => [tag.attrs.rel, tag.attrs.href]);
    expect(links).toEqual([
      ["preload", "./assets/cinzel-latin-wght-normal-g.woff2"],
      ["preload", "./assets/eb-garamond-latin-wght-normal-h.woff2"],
      ["preload", "./assets/App-e.css"],
      ["modulepreload", "./assets/App-c.js"],
      ["modulepreload", "./assets/data-d.js"],
    ]);
  });

  test("marks every link crossorigin so preloaded responses are reused", () => {
    for (const tag of tags(bundle)) {
      expect(tag).toMatchObject({ tag: "link", injectTo: "head" });
      expect(tag.attrs.crossorigin).toBe(true);
    }
    expect(tags(bundle).filter(tag => tag.attrs.as === "font").every(tag => tag.attrs.type === "font/woff2")).toBe(true);
  });

  test("honours the configured base", () => {
    expect(tags(bundle, "/mg/")[0]!.attrs.href).toBe("/mg/assets/cinzel-latin-wght-normal-g.woff2");
  });

  test("fails the build if the app chunk disappears", () => {
    const { ["assets/App-c.js"]: _, ...rest } = bundle;
    expect(() => tags(rest)).toThrow(/no chunk for src\/App.svelte/);
  });
});
