import { defineConfig, loadEnv, type HtmlTagDescriptor, type Plugin } from "vite";
import type { OutputBundle, OutputChunk } from "rolldown";
import { svelte } from "@sveltejs/vite-plugin-svelte";

/** Injects the Cloudflare Web Analytics beacon only when a site token is configured at build time. */
export function cloudflareAnalytics(token: string | undefined): Plugin {
  return {
    name: "cloudflare-web-analytics",
    transformIndexHtml() {
      const value = token?.trim();
      if (!value) return [];
      return [{
        tag: "script",
        attrs: { defer: true, src: "https://static.cloudflareinsights.com/beacon.min.js", "data-cf-beacon": JSON.stringify({ token: value }) },
        injectTo: "body",
      }];
    },
  };
}

/** Upright Latin fonts used on every page; the italic and other subsets stay lazy (preloading them costs more bandwidth than it saves). */
const CRITICAL_FONTS = /^assets\/(cinzel|eb-garamond)-latin-wght-normal-[\w-]+\.woff2$/;

/**
 * main.ts loads App.svelte with a dynamic import so startup failures stay visible,
 * which hides the app chunks from the HTML. Announce them (and the critical fonts)
 * up front so the browser fetches everything in parallel with the entry script.
 */
export function preloadAppEntry(entry = "src/App.svelte"): Plugin {
  let base = "./";
  return {
    name: "preload-app-entry",
    apply: "build",
    configResolved(config) { base = config.base; },
    transformIndexHtml(_html, ctx) {
      const bundle = ctx.bundle as OutputBundle | undefined;
      if (!bundle) return [];
      const chunks = Object.values(bundle).filter((item): item is OutputChunk => item.type === "chunk");
      const app = chunks.find(chunk => chunk.facadeModuleId?.replaceAll("\\", "/").endsWith(entry));
      if (!app) throw new Error(`preload-app-entry: no chunk for ${entry}`);
      const byName = new Map(chunks.map(chunk => [chunk.fileName, chunk]));
      // Vite already preloads the entry and its static imports.
      const entryChunk = chunks.find(chunk => chunk.isEntry);
      const known = new Set(entryChunk ? [entryChunk.fileName, ...entryChunk.imports] : []);
      const scripts = new Set<string>(), styles = new Set<string>();
      const visit = (chunk: OutputChunk) => {
        if (scripts.has(chunk.fileName)) return;
        scripts.add(chunk.fileName);
        chunk.viteMetadata?.importedCss.forEach(css => styles.add(css));
        chunk.imports.forEach(name => { const next = byName.get(name); if (next) visit(next); });
      };
      visit(app);
      known.forEach(name => scripts.delete(name));
      const link = (attrs: Record<string, string | boolean>): HtmlTagDescriptor => ({ tag: "link", attrs: { ...attrs, href: base + attrs.href }, injectTo: "head" });
      return [
        ...Object.keys(bundle).filter(name => CRITICAL_FONTS.test(name)).sort()
          .map(href => link({ rel: "preload", as: "font", type: "font/woff2", crossorigin: true, href })),
        ...[...styles].map(href => link({ rel: "preload", as: "style", crossorigin: true, href })),
        ...[...scripts].map(href => link({ rel: "modulepreload", crossorigin: true, href })),
      ];
    },
  };
}

// Relative base so the build works under any Pages sub-path.
export default defineConfig(({ mode }) => ({
  base: "./",
  plugins: [svelte(), preloadAppEntry(), cloudflareAnalytics(loadEnv(mode, process.cwd(), "VITE_").VITE_CF_ANALYTICS_TOKEN)],
}));
