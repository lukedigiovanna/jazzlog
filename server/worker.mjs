import { appleMusicLookup } from "./appleMusic.mjs";
export default {
  fetch(request, env) {
    if (new URL(request.url).pathname === "/api/apple-music") {
      if (request.method !== "GET") return new Response(null, { status: 405 });
      return appleMusicLookup(request);
    }
    return env.ASSETS.fetch(request);
  },
};
