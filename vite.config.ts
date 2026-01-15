// vite.config.ts

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(() => ({
  server: {
    host: "::", // Allows access from other devices on your network
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React libraries
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // Firebase SDK
          "vendor-firebase": [
            "firebase/app",
            "firebase/auth",
            "firebase/firestore",
            "firebase/storage",
          ],
          // UI libraries
          "vendor-ui": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-select",
            "@radix-ui/react-tabs",
            "framer-motion",
          ],
          // Chart libraries
          "vendor-charts": ["chart.js", "react-chartjs-2", "recharts"],
        },
      },
    },
  },
}));
