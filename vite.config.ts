import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// Relative base so the build works under any Pages sub-path.
export default defineConfig({ base: "./", plugins: [svelte()] });
