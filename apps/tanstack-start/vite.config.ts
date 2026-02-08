import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  server: {
    // Allow LAN access so Expo devices can reach the dev server.
    host: true,
    port: 3001,
  },
  plugins: [
    tsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    nitro(),
    tanstackStart({
      spa: {
        enabled: true,
      },
    }),
    viteReact(),
    tailwindcss(),
  ],
});
