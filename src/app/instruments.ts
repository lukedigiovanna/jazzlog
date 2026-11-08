import type { Album, Instrument, InstrumentCategory } from "../types/albums";

export const instrumentCategories: InstrumentCategory[] = [
  "percussion",
  "strings",
  "woodwind",
  "brass",
  "keyboard",
  "electronic",
  "voice",
  "other",
];

// Prefer the playing family over broad electronic/other classifications.
export const instrumentIconPriority: readonly InstrumentCategory[] = [
  "keyboard",
  "strings",
  "woodwind",
  "brass",
  "percussion",
  "voice",
  "electronic",
  "other",
];

export function instrumentCategoryIcon(
  categories: readonly InstrumentCategory[] = [],
) {
  const category =
    instrumentIconPriority.find((category) => categories.includes(category)) ??
    "other";
  return `instrument-${category}`;
}

export const categoryLabel = (category: string) =>
  category.charAt(0).toUpperCase() + category.slice(1);

export const instrumentUrl = (id: string) =>
  `#instrument/${encodeURIComponent(id)}`;

export const albumsUsing = (albums: Album[], id: string) =>
  albums.filter((album) => album.instruments.some((item) => item.id === id));

// Read models on albums retain association notes; names/categories come from the catalog.
export function syncAlbumInstruments(
  albums: Album[],
  instruments: Instrument[],
): void {
  const catalog = new Map(instruments.map((item) => [item.id, item]));
  for (const album of albums)
    album.instruments = album.instruments.flatMap((item) => {
      const instrument = catalog.get(item.id);
      return instrument ? [{ ...instrument, notes: item.notes }] : [];
    });
}
