import { instrumentCategoryIcon } from "../app/instruments.ts";
import type { Album, InstrumentCategory } from "../types/albums";
import { latest, webUrl } from "./presentation.ts";
import { escapeHtml as e } from "./html.ts";
import { icon } from "./icons.ts";

export function catalogStats(albums: Album[]) {
  const entries = albums.flatMap((album) => {
    const entry = latest(album);
    return entry ? [entry] : [];
  });
  return {
    count: albums.length,
    rated: entries.length,
    average: entries.length
      ? entries.reduce((sum, entry) => sum + entry.rating / 2, 0) /
        entries.length
      : null,
    recent:
      entries
        .map((entry) => entry.listenedAt)
        .sort()
        .at(-1) ?? "",
  };
}

export function compareCatalog(
  a: ReturnType<typeof catalogStats>,
  b: ReturnType<typeof catalogStats>,
  sort: string,
) {
  if (sort === "rating")
    return (b.average ?? -1) - (a.average ?? -1) || b.rated - a.rated;
  if (sort === "recent") return b.recent.localeCompare(a.recent);
  return sort === "name" ? 0 : b.count - a.count;
}

export function catalogSort(id: string, value: string, showRating = true) {
  return /* HTML */ `<label class="field"
    ><span>Sort by</span>
    <select id="${id}">
      ${[
        ["albums", "Most albums"],
        ["rating", "Highest rated"],
        ["recent", "Recently listened"],
        ["name", "Name"],
      ]
        .filter(([key]) => showRating || key !== "rating")
        .map(
          ([key, label]) =>
            /* HTML */ `<option
              value="${key}"
              ${value === key ? "selected" : ""}
            >
              ${label}
            </option>`,
        )
        .join("")}
    </select></label
  >`;
}

export function catalogSummary(albums: Album[], showRating = true) {
  if (!showRating)
    return /* HTML */ `<span class="catalog-stats"
      ><span
        ><strong>${albums.length}</strong
        ><small>${albums.length === 1 ? "album" : "albums"}</small></span
      ></span
    >`;
  const stats = catalogStats(albums);
  return /* HTML */ `<span class="catalog-stats"
    ><span
      ><strong>${stats.count}</strong
      ><small>${stats.count === 1 ? "album" : "albums"}</small></span
    ><span title="Average of the latest rating for each rated album"
      ><strong
        >${stats.average === null ? "Unrated" : `★ ${stats.average.toFixed(1)}`}</strong
      ><small
        >${stats.rated ? `${stats.rated} rated` : "No ratings yet"}</small
      ></span
    ></span
  >`;
}

export function catalogImage(
  name: string,
  url?: string | null,
  artist = false,
  categories: readonly InstrumentCategory[] = [],
) {
  const image = webUrl(url)?.href;
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("");
  return /* HTML */ `<span
    class="catalog-image ${artist ? "artist-portrait" : ""}"
    aria-hidden="true"
    ><span
      >${artist ? e(initials) : icon(instrumentCategoryIcon(categories), 32)}</span
    >${image ? /* HTML */ `<img src="${e(image)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" />` : ""}</span
  >`;
}
