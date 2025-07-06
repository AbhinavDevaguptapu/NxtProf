// vite.config.ts

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::", // Allows access from other devices on your network
    port: 8080,
    proxy: {
      // Proxies any request starting with /sheet-sync
      "/sheet-sync": {
        // This should be your NEWEST deployment URL that Postman confirmed was working
        target: "https://script.google.com/macros/s/AKfycbz63CXujNicDEJkk506zesFeJoaXUUFCnoUu16KwqVmFXkO4MCPgRMznX-A6Ma-pm4ecA/exec",
        changeOrigin: true, // Necessary for virtual hosted sites
        secure: true,       // Verifies the SSL Cert
        rewrite: (path) => path.replace(/^\/sheet-sync/, ""), // Removes /sheet-sync from the path
      },
    },
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));