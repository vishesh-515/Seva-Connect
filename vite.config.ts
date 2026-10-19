// Vite and TanStack Start build configuration for Seva Connect
// Includes TanStack Start, React, Tailwind CSS, Nitro server bundle, and path aliases.
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";

export default defineConfig(({ command }) => ({
  plugins: [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      server: { entry: "server" },
    }),
    command === "build"
      ? nitro({
          defaultPreset:
            process.env["NITRO_PRESET"] || (process.env["VERCEL"] ? "vercel" : "cloudflare-module"),
        })
      : undefined,
    viteReact(),
  ].filter(Boolean),
  server: {
    port: 8080,
  },
}));
