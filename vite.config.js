import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/backend-api": {
        target: "http://127.0.0.1:5004",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/backend-api/, ""),
      },
      "/api": { target: "http://127.0.0.1:5005", changeOrigin: true },
      "/healthz": { target: "http://127.0.0.1:5005", changeOrigin: true },
    },
  },
});
