import type { Album, AlbumLink } from "../types/albums";

// Illustrated covers and catalog records are local demo fixtures, not API results.
export const ratingLabels = [
  "Get this away from me",
  "Actively unpleasant",
  "Not for me",
  "Pretty forgettable",
  "Some good, some snooze",
  "Solid listen",
  "Glad I heard it",
  "Excellent album",
  "Nearly a classic",
  "Inject this into my bloodstream",
];

const apple = (path: string): FixtureLink => ({
  url: "https://music.apple.com/us/album/" + path,
});
const youtube = (query: string): FixtureLink => ({
  label: "YouTube search",
  url:
    "https://www.youtube.com/results?search_query=" + encodeURIComponent(query),
});

type FixtureLink = Pick<AlbumLink, "url"> & Partial<Pick<AlbumLink, "label">>;
type RecordFixture = [
  string,
  string,
  string[],
  number,
  string[],
  string,
  FixtureLink[]?,
];
const records: RecordFixture[] = [
  [
    "seychelles",
    "Seychelles",
    ["Masayoshi Takanaka"],
    1976,
    ["Japanese Fusion", "Jazz Fusion"],
    "Kitty Records",
    [
      apple("seychelles/1443091653"),
      youtube("Masayoshi Takanaka Seychelles full album"),
    ],
  ],
  [
    "black-classical",
    "Black Classical Music",
    ["Yussef Dayes"],
    2023,
    ["Contemporary Jazz"],
    "Brownswood Recordings",
    [apple("black-classical-music/1683439010")],
  ],
  [
    "mint-jams",
    "Mint Jams",
    ["Casiopea"],
    1982,
    ["Japanese Fusion", "Jazz Fusion"],
    "Alfa Records",
    [apple("mint-jams-live/1535034571")],
  ],
  [
    "funky-stuff",
    "Funky Stuff",
    ["Jiro Inagaki & Soul Media"],
    1975,
    ["Jazz Funk", "Japanese Fusion"],
    "Nippon Columbia",
    [youtube("Jiro Inagaki Soul Media Funky Stuff full album")],
  ],
  [
    "light-as-a-feather",
    "Light as a Feather",
    ["Chick Corea", "Return to Forever"],
    1973,
    ["Latin Jazz", "Jazz Fusion"],
    "Polydor",
    [apple("light-as-a-feather/1443203400")],
  ],
  [
    "insatiable-high",
    "An Insatiable High",
    ["Masayoshi Takanaka"],
    1977,
    ["Japanese Fusion", "Jazz Funk"],
    "Kitty Records",
    [youtube("Masayoshi Takanaka An Insatiable High full album")],
  ],
  [
    "black-focus",
    "Black Focus",
    ["Yussef Kamaal"],
    2016,
    ["Contemporary Jazz", "Jazz Funk"],
    "Brownswood Recordings",
    [youtube("Yussef Kamaal Black Focus full album")],
  ],
  [
    "heavy-weather",
    "Heavy Weather",
    ["Weather Report"],
    1977,
    ["Jazz Fusion"],
    "Columbia Records",
    [youtube("Weather Report Heavy Weather full album")],
  ],
  [
    "bright-size-life",
    "Bright Size Life",
    ["Pat Metheny"],
    1976,
    ["Contemporary Jazz"],
    "ECM Records",
    [youtube("Pat Metheny Bright Size Life full album")],
  ],
  [
    "mysterious-traveller",
    "Mysterious Traveller",
    ["Weather Report"],
    1974,
    ["Jazz Fusion"],
    "Columbia Records",
    [youtube("Weather Report Mysterious Traveller full album")],
  ],
  [
    "kind-of-blue",
    "Kind of Blue",
    ["Miles Davis"],
    1959,
    ["Modal Jazz"],
    "Columbia Records",
  ],
  [
    "blue-train",
    "Blue Train",
    ["John Coltrane"],
    1958,
    ["Hard Bop"],
    "Blue Note",
  ],
  [
    "love-supreme",
    "A Love Supreme",
    ["John Coltrane"],
    1965,
    ["Spiritual Jazz", "Modal Jazz"],
    "Impulse!",
  ],
  [
    "head-hunters",
    "Head Hunters",
    ["Herbie Hancock"],
    1973,
    ["Jazz Funk", "Jazz Fusion"],
    "Columbia Records",
  ],
  [
    "time-out",
    "Time Out",
    ["The Dave Brubeck Quartet"],
    1959,
    ["Cool Jazz"],
    "Columbia Records",
  ],
  [
    "moanin",
    "Moanin’",
    ["Art Blakey & the Jazz Messengers"],
    1959,
    ["Hard Bop"],
    "Blue Note",
  ],
  [
    "mingus",
    "Mingus Ah Um",
    ["Charles Mingus"],
    1959,
    ["Post-Bop"],
    "Columbia Records",
  ],
  [
    "speak-no-evil",
    "Speak No Evil",
    ["Wayne Shorter"],
    1966,
    ["Post-Bop"],
    "Blue Note",
  ],
  [
    "bitches-brew",
    "Bitches Brew",
    ["Miles Davis"],
    1970,
    ["Jazz Fusion"],
    "Columbia Records",
  ],
  [
    "breezin",
    "Breezin’",
    ["George Benson"],
    1976,
    ["Jazz Funk"],
    "Warner Bros. Records",
  ],
  [
    "night-in-tunisia",
    "A Night in Tunisia",
    ["Art Blakey & the Jazz Messengers"],
    1961,
    ["Hard Bop"],
    "Blue Note",
  ],
  [
    "expansions",
    "Expansions",
    ["Lonnie Liston Smith & the Cosmic Echoes"],
    1975,
    ["Jazz Funk", "Spiritual Jazz"],
    "Flying Dutchman Records",
  ],
];

export const catalog: Album[] = records.map(
  ([id, title, artists, releaseYear, genres, recordLabel, links]) => ({
    id,
    title,
    sortTitle: null,
    releaseYear,
    recordLabel,
    artworkUrl: "/art/" + id + ".svg",
    musicbrainzReleaseGroupId: null,
    createdAt: "2026-11-01",
    updatedAt: "2026-11-01",
    artists: artists.map((name, position) => ({
      id: `${id}-artist-${position}`,
      name,
      sortName: null,
      musicbrainzId: null,
      country: null,
      role: "primary",
      position,
    })),
    genres: genres.map((name, index) => ({
      id: "genre-" + name.toLowerCase().replaceAll(" ", "-"),
      name,
      parentGenreId: null,
      isPrimary: index === 0,
    })),
    instruments: [],
    links: (links ?? [youtube(artists[0] + " " + title + " full album")]).map(
      (link, index) => ({
        id: `${id}-link-${index}`,
        url: link.url,
        label: link.label ?? null,
      }),
    ),
    listeningEntries: [],
  }),
);

const listening: [string, number, string, string[]][][] = [
  [
    [
      "2026-11-04",
      10,
      "The guitar tone on “Tropic Birds” is all sunshine. This one went straight back on after the last track.",
      ["Electric guitar", "Bass", "Percussion"],
    ],
    [
      "2026-10-20",
      9,
      "The opening groove sold me immediately.",
      ["Electric guitar", "Keyboards"],
    ],
  ],
  [
    [
      "2026-11-02",
      9,
      "The pocket on “Tioga Pass” is unreal. Love how much space the bass and drums leave for each other.",
      ["Drums", "Bass", "Saxophone"],
    ],
  ],
  [
    [
      "2026-11-01",
      7,
      "“Domino Line” is the standout. That live bass break is worth going back for.",
      ["Electric guitar", "Bass", "Keyboards", "Drums"],
    ],
  ],
  [
    [
      "2026-10-31",
      9,
      "Big horn lines and a ridiculous backbeat. “Breeze” is the one I keep coming back to.",
      ["Saxophone", "Electric bass", "Drums"],
    ],
  ],
  [
    [
      "2026-10-30",
      9,
      "The Rhodes and flute sound so light together. “500 Miles High” was the highlight on this listen.",
      ["Electric piano", "Flute", "Vocals"],
    ],
  ],
  [
    [
      "2026-10-29",
      8,
      "Silky rhythm section. The longer cuts have room to settle into a groove.",
      ["Electric guitar", "Bass", "Keyboards"],
    ],
  ],
  [
    [
      "2026-10-28",
      8,
      "Loose, dusty drums and a warm Rhodes sound. The whole thing feels lived-in.",
      ["Drums", "Electric piano", "Bass"],
    ],
  ],
  [
    [
      "2026-10-23",
      7,
      "The bass is the hook. “Teen Town” has more going on than I caught on the first pass.",
      ["Bass", "Saxophone", "Synthesizer"],
    ],
  ],
  [
    [
      "2026-10-21",
      6,
      "Spacious trio record. The interplay is more interesting to me than any individual tune.",
      ["Electric guitar", "Bass", "Drums"],
    ],
  ],
  [
    [
      "2026-10-19",
      5,
      "The textures are interesting, though I kept waiting for a groove to take hold.",
      ["Keyboards", "Saxophone", "Percussion"],
    ],
  ],
];

export const mockAlbums: Album[] = catalog
  .slice(0, listening.length)
  .map((album, index) => ({
    ...album,
    sourceId: album.id,
    createdAt: listening[index].at(-1)![0],
    updatedAt: listening[index][0][0],
    listeningEntries: listening[index].map(
      ([listenedAt, rating, notes, instruments], i) => ({
        id: album.id + "-" + i,
        listenedAt,
        rating,
        notes,
        instruments,
        createdAt: listenedAt,
        updatedAt: listenedAt,
      }),
    ),
  }));
