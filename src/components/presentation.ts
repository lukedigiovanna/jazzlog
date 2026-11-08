import type { Album } from "../types/albums";
import { icon } from "./icons.ts";
import { escapeHtml } from "./html.ts";
export function webUrl(value: string | null | undefined) {
  try {
    const parsed = new URL(value ?? "");
    if (
      ["https:", "http:"].includes(parsed.protocol) &&
      !parsed.username &&
      !parsed.password
    )
      return parsed;
  } catch {
    return null;
  }
  return null;
}

export function artworkUrl(value: string | null | undefined = "") {
  if (/^\/art\/[a-z0-9-]+\.svg$/.test(value ?? "")) return value ?? "";
  return webUrl(value)?.href ?? "";
}

export function cover(album: Partial<Album>, eager = false) {
  const url = artworkUrl(album.artworkUrl);
  return /* HTML */ `<span class="cover" aria-hidden="true"
    ><span class="cover-placeholder">${icon("disc", 39)}</span
    >${url ? /* HTML */ `<img src="${escapeHtml(url)}" alt="" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" referrerpolicy="no-referrer" />` : ""}</span
  >`;
}

export function artistText(album: Album) {
  return (
    album.artists
      .filter((artist) => artist.role === "primary")
      .sort((a, b) => a.position - b.position)
      .map((artist) => artist.name)
      .join(" & ") || "Unknown artist"
  );
}

export function orderedListens(album: Album) {
  return [...album.listeningEntries].sort((a, b) =>
    b.listenedAt.localeCompare(a.listenedAt),
  );
}

export function latest(album: Album) {
  return orderedListens(album)[0];
}

export function displayRating(rating: number) {
  return rating / 2;
}

export function chips(values: string[]) {
  return values
    .map((value) => /* HTML */ `<span class="chip">${escapeHtml(value)}</span>`)
    .join("");
}

export function albumUrl(id: string) {
  return "#album/" + encodeURIComponent(id);
}
