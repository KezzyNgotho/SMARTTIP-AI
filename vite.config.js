import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  publicDir: false,
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        background: resolve(__dirname, "src/background.js"),
        contentScript: resolve(__dirname, "src/contentScript.js"),
        sw: resolve(__dirname, "sw.js")
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === "background") {
            return "background.js";
          }

          if (chunkInfo.name === "contentScript") {
            return "contentScript.js";
          }

          if (chunkInfo.name === "sw") {
            return "sw.js";
          }

          return "assets/[name]-[hash].js";
        }
      }
    }
  }
});
