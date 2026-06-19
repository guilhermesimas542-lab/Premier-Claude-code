import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    // Vita varre o root atrás de index.html — limitamos pra evitar que ele
    // pegue o `_app-prod-ref/index.html` do clone do app de produção.
    entries: ["index.html"],
  },
});
