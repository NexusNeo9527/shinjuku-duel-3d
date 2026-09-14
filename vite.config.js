import { defineConfig } from "vite";

export default defineConfig({
  // relative base so the build also works when hosted under a sub-path
  // (e.g. GitHub Pages: https://<user>.github.io/<repo>/)
  base: "./",
  server: {
    host: true,
    port: 5173
  },
  build: {
    chunkSizeWarningLimit: 1600
  }
});
