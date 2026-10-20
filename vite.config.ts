import { defineConfig, loadEnv, type Plugin } from "vite";
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

// Relative base so the build works under any Pages sub-path.
export default defineConfig(({ mode }) => ({
  base: "./",
  plugins: [svelte(), cloudflareAnalytics(loadEnv(mode, process.cwd(), "VITE_").VITE_CF_ANALYTICS_TOKEN)],
}));
