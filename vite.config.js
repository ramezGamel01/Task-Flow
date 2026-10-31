import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Served from the root of its Vercel domain
export default defineConfig({
  base: "/",
  plugins: [react()],
  build: {
    // three.js, React Three Fiber and drei share one chunk that only 3D views load
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Keep three.js in its own chunk; only pages with 3D scenes load it.
        // Package names are matched exactly so R3F's own react-* dependencies stay with three.
        manualChunks(id) {
          // Vite's preload helper must not land in the three chunk, or every page would preload it
          if (id.includes("preload-helper") || id.includes("commonjsHelpers")) return "react";
          // Module ids use forward slashes on every platform once Vite normalizes them
          if (/node_modules\/(three|@react-three|three-stdlib|react-reconciler|its-fine|zustand|suspend-react|react-use-measure)\//.test(id)) return "three";
          if (/node_modules\/(react|react-dom|scheduler|react-router)\//.test(id)) return "react";
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.js"],
    css: false,
  },
});
