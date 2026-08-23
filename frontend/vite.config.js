import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Standard Vite + React setup - nothing custom needed for this app.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
});
