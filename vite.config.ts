import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
// No longer importing componentTagger since it's removed
// import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 3000,
  },
  plugins: [
    react(),
    // The componentTagger plugin has been removed from this array.
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
