import { defineConfig } from "vite"
import laravel from "laravel-vite-plugin"
import vue from "@vitejs/plugin-vue"
import { resolve } from "path"

export default defineConfig({
  plugins: [
    laravel({
      input: ["resources/css/app.css", "resources/js/app.ts"],
      refresh: true,
    }),
    vue({
      template: {
        transformAssetUrls: {
          base: null,
          includeAbsolute: false,
        },
      },
    }),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "resources/js"),
    },
  },
  define: {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false,
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    cors: true,
    hmr: {
      host: "localhost",
      port: 5173,
    },
  },
  build: {
    outDir: "public/build",
    manifest: true,
    rollupOptions: {
      input: {
        app: "resources/js/app.ts",
        css: "resources/css/app.css",
      },
    },
  },
})
