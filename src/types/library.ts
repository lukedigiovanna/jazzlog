import type { Album, Artist, Genre, Instrument } from "./albums";

export interface LibraryData {
  albums: Album[];
  artists: Artist[];
  genres: Genre[];
  instruments: Instrument[];
}
