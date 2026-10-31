import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, "../..", "");
  const publicUrl = environment.WEB_APP_URL ?? "http://localhost:3000";

  return {
    server: {
      host: "0.0.0.0",
      port: 3000,
      strictPort: true,
      allowedHosts: ["yoda0ne.taila27a8e.ts.net", "yoda0ne.exe.xyz"],
    },
    resolve: {
      tsconfigPaths: true,
    },
    plugins: [
      {
        name: "log-public-url",
        configureServer(server) {
          server.httpServer?.once("listening", () => {
            server.config.logger.info(`  ➜  Public:  ${publicUrl}`);
          });
        },
      },
      tailwindcss(),
      tanstackStart({
        srcDirectory: "src",
      }),
      viteReact(),
      nitro({
        devProxy: {
          "/api/**": {
            target: "http://127.0.0.1:3100",
            changeOrigin: true,
          },
        },
      }),
    ],
  };
});
