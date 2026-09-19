import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Deployed to Vercel, which serves from the domain root, so no custom base path is needed.
export default defineConfig({
  plugins: [react()],
});
