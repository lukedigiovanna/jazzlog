import { defineConfig } from "vite";
import { installAppleMusicMiddleware } from "./server/appleMusicMiddleware.mjs";
export default defineConfig({
  plugins: [
    {
      name: "apple-music-api",
      configureServer: installAppleMusicMiddleware,
      configurePreviewServer: installAppleMusicMiddleware,
    },
  ],
});
