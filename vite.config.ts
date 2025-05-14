import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/",
  resolve: {
    alias: {
      // any time code tries to import('canvas'), it'll get an empty module
      canvas: '/empty-module.js',
    },
  },
  optimizeDeps: {
    // don't pre-bundle canvas
    exclude: ["canvas"],
  },
  ssr: {
    // don't try to include canvas in server-side builds
    external: ["canvas"],
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    rollupOptions: {
      output: {
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
});