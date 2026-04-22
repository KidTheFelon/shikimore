import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
    hmr: {
      overlay: false,
    },
  },
  build: {
    target: "esnext",
    minify: "esbuild",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom"],
          "tauri-vendor": ["@tauri-apps/api", "@tauri-apps/plugin-shell"],
        },
      },
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom", "@tauri-apps/api"],
  },
});
