import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    // Serve index.html for any path Vite can't match — required for BrowserRouter
    // with slug-prefixed routes like /acme-gas/fuel on direct browser refresh.
    historyApiFallback: true,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["krstlogo.png", "icons/*.png"],
      // Only the built app shell (JS/CSS/HTML/images) is precached — API
      // responses are never runtime-cached here (no `runtimeCaching` rules),
      // so live business data (sessions, sales, stock) always hits the
      // network fresh. This is deliberate: a stale-cache bug in a POS/stock
      // app is far worse than an offline app shell.
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        navigateFallbackDenylist: [/^\/api\//],
      },
      manifest: {
        id: "/",
        name: "ISMS Station Flow",
        short_name: "Station Flow",
        description: "Station Flow — multi-business service station management by Krestworks Solutions.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        display_override: ["window-controls-overlay", "standalone"],
        orientation: "any",
        background_color: "#ffffff",
        theme_color: "#259d91",
        categories: ["business", "productivity"],
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
