import type { Album, ListeningEntry } from "../types/albums";
import { getReleaseGroupArtworkUrl } from "../services/coverArt";

// Keep mock listening entries concise while preserving the database-shaped
// fields the UI will eventually consume.
function entry(
    id: string,
    rating: number,
    listenedAt: string,
    notes: string | null = null
): ListeningEntry {
    return {
        id,
        rating,
        listenedAt,
        notes,
        createdAt: listenedAt,
        updatedAt: listenedAt,
    };
}

export const mockAlbums: Album[] = [
    {
        id: "album-kind-of-blue",
        title: "Kind of Blue",
        sortTitle: "Kind of Blue",
        releaseYear: 1959,
        artworkUrl: getReleaseGroupArtworkUrl(
            "8e8a594f-2175-38c7-a871-abb68ec363e7"
        ),
        musicbrainzReleaseGroupId:
            "8e8a594f-2175-38c7-a871-abb68ec363e7",
        createdAt: "2026-08-14T18:42:00.000Z",
        updatedAt: "2026-10-28T21:10:00.000Z",
        artists: [
            {
                id: "artist-miles-davis",
                musicbrainzId:
                    "561d854a-6a28-4aa7-8c99-323e6ce46c2a",
                name: "Miles Davis",
                sortName: "Davis, Miles",
                country: "US",
                role: "primary",
                position: 0,
            },
        ],
        genres: [
            {
                id: "genre-modal-jazz",
                name: "Modal Jazz",
                parentGenreId: "genre-jazz",
                isPrimary: true,
            },
            {
                id: "genre-cool-jazz",
                name: "Cool Jazz",
                parentGenreId: "genre-jazz",
                isPrimary: false,
            },
        ],
        instruments: [
            {
                id: "instrument-trumpet",
                name: "Trumpet",
                notes: "Miles Davis",
                categories: ["brass"],
            },
            {
                id: "instrument-alto-saxophone",
                name: "Alto Saxophone",
                notes: "Julian \"Cannonball\" Adderley",
                categories: ["woodwind"],
            },
            {
                id: "instrument-tenor-saxophone",
                name: "Tenor Saxophone",
                notes: "John Coltrane",
                categories: ["woodwind"],
            },
            {
                id: "instrument-piano",
                name: "Piano",
                notes: "Bill Evans and Wynton Kelly",
                categories: ["keyboard"],
            },
            {
                id: "instrument-double-bass",
                name: "Double Bass",
                notes: "Paul Chambers",
                categories: ["strings"],
            },
            {
                id: "instrument-drums",
                name: "Drums",
                notes: "Jimmy Cobb",
                categories: ["percussion"],
            },
        ],
        links: [],
        listeningEntries: [
            entry(
                "listen-kind-of-blue-3",
                10,
                "2026-10-28T21:10:00.000Z",
                "Still the standard. The space between the notes does more than most records manage in full."
            ),
            entry(
                "listen-kind-of-blue-2",
                9,
                "2026-09-14T22:35:00.000Z",
                "Late-night listen. \"Flamenco Sketches\" is the heart of it."
            ),
            entry(
                "listen-kind-of-blue-1",
                8,
                "2026-06-02T19:05:00.000Z"
            ),
        ],
    },
    {
        id: "album-love-supreme",
        title: "A Love Supreme",
        sortTitle: "Love Supreme, A",
        releaseYear: 1965,
        artworkUrl: getReleaseGroupArtworkUrl(
            "77cf47ba-58cd-3f3d-a5f9-79bf89860421"
        ),
        musicbrainzReleaseGroupId:
            "77cf47ba-58cd-3f3d-a5f9-79bf89860421",
        createdAt: "2026-07-03T16:28:00.000Z",
        updatedAt: "2026-10-30T20:12:00.000Z",
        artists: [
            {
                id: "artist-john-coltrane",
                musicbrainzId:
                    "b625448e-bf4a-41c3-a421-72ad46cdb831",
                name: "John Coltrane",
                sortName: "Coltrane, John",
                country: "US",
                role: "primary",
                position: 0,
            },
        ],
        genres: [
            {
                id: "genre-spiritual-jazz",
                name: "Spiritual Jazz",
                parentGenreId: "genre-jazz",
                isPrimary: true,
            },
            {
                id: "genre-modal-jazz",
                name: "Modal Jazz",
                parentGenreId: "genre-jazz",
                isPrimary: false,
            },
        ],
        instruments: [
            {
                id: "instrument-tenor-saxophone",
                name: "Tenor Saxophone",
                notes: "John Coltrane",
                categories: ["woodwind"],
            },
            {
                id: "instrument-piano",
                name: "Piano",
                notes: "McCoy Tyner",
                categories: ["keyboard"],
            },
            {
                id: "instrument-double-bass",
                name: "Double Bass",
                notes: "Jimmy Garrison",
                categories: ["strings"],
            },
            {
                id: "instrument-drums",
                name: "Drums",
                notes: "Elvin Jones",
                categories: ["percussion"],
            },
        ],
        links: [],
        listeningEntries: [
            entry(
                "listen-love-supreme-2",
                9,
                "2026-10-30T20:12:00.000Z",
                "\"Acknowledgment\" still gives me chills."
            ),
            entry(
                "listen-love-supreme-1",
                8,
                "2026-08-21T17:45:00.000Z"
            ),
        ],
    },
    {
        id: "album-time-out",
        title: "Time Out",
        sortTitle: "Time Out",
        releaseYear: 1959,
        artworkUrl: getReleaseGroupArtworkUrl(
            "035a7881-3e2c-39d2-b110-fe26a4de94e5"
        ),
        musicbrainzReleaseGroupId:
            "035a7881-3e2c-39d2-b110-fe26a4de94e5",
        createdAt: "2026-06-18T11:03:00.000Z",
        updatedAt: "2026-10-22T18:20:00.000Z",
        artists: [
            {
                id: "artist-dave-brubeck-quartet",
                musicbrainzId:
                    "7bf711e9-4e69-4e08-b6e8-c0cb5805f1e7",
                name: "The Dave Brubeck Quartet",
                sortName: "Dave Brubeck Quartet, The",
                country: "US",
                role: "primary",
                position: 0,
            },
        ],
        genres: [
            {
                id: "genre-cool-jazz",
                name: "Cool Jazz",
                parentGenreId: "genre-jazz",
                isPrimary: true,
            },
            {
                id: "genre-west-coast-jazz",
                name: "West Coast Jazz",
                parentGenreId: "genre-cool-jazz",
                isPrimary: false,
            },
        ],
        instruments: [
            {
                id: "instrument-piano",
                name: "Piano",
                notes: "Dave Brubeck",
                categories: ["keyboard"],
            },
            {
                id: "instrument-alto-saxophone",
                name: "Alto Saxophone",
                notes: "Paul Desmond",
                categories: ["woodwind"],
            },
            {
                id: "instrument-double-bass",
                name: "Double Bass",
                notes: "Eugene Wright",
                categories: ["strings"],
            },
            {
                id: "instrument-drums",
                name: "Drums",
                notes: "Joe Morello",
                categories: ["percussion"],
            },
        ],
        links: [],
        listeningEntries: [
            entry(
                "listen-time-out-2",
                8,
                "2026-10-22T18:20:00.000Z",
                "\"Blue Rondo a la Turk\" is a workout for the ears."
            ),
            entry(
                "listen-time-out-1",
                7,
                "2026-07-11T14:10:00.000Z"
            ),
        ],
    },
    {
        id: "album-maiden-voyage",
        title: "Maiden Voyage",
        sortTitle: "Maiden Voyage",
        releaseYear: 1965,
        artworkUrl: getReleaseGroupArtworkUrl(
            "c5e5e8ad-dc89-319e-8b2d-b3ff5e59fcea"
        ),
        musicbrainzReleaseGroupId:
            "c5e5e8ad-dc89-319e-8b2d-b3ff5e59fcea",
        createdAt: "2026-07-27T09:50:00.000Z",
        updatedAt: "2026-10-18T19:40:00.000Z",
        artists: [
            {
                id: "artist-herbie-hancock",
                musicbrainzId:
                    "27613b78-1b9d-4ec3-9db5-fa0743465fdd",
                name: "Herbie Hancock",
                sortName: "Hancock, Herbie",
                country: "US",
                role: "primary",
                position: 0,
            },
        ],
        genres: [
            {
                id: "genre-post-bop",
                name: "Post-Bop",
                parentGenreId: "genre-jazz",
                isPrimary: true,
            },
            {
                id: "genre-modal-jazz",
                name: "Modal Jazz",
                parentGenreId: "genre-jazz",
                isPrimary: false,
            },
        ],
        instruments: [
            {
                id: "instrument-piano",
                name: "Piano",
                notes: "Herbie Hancock",
                categories: ["keyboard"],
            },
            {
                id: "instrument-trumpet",
                name: "Trumpet",
                notes: "Freddie Hubbard",
                categories: ["brass"],
            },
            {
                id: "instrument-tenor-saxophone",
                name: "Tenor Saxophone",
                notes: "George Coleman",
                categories: ["woodwind"],
            },
            {
                id: "instrument-double-bass",
                name: "Double Bass",
                notes: "Ron Carter",
                categories: ["strings"],
            },
            {
                id: "instrument-drums",
                name: "Drums",
                notes: "Tony Williams",
                categories: ["percussion"],
            },
        ],
        links: [],
        listeningEntries: [
            entry(
                "listen-maiden-voyage-2",
                9,
                "2026-10-18T19:40:00.000Z"
            ),
            entry(
                "listen-maiden-voyage-1",
                8,
                "2026-05-30T21:15:00.000Z",
                "The title track feels like open water."
            ),
        ],
    },
    {
        id: "album-mingus-ah-um",
        title: "Mingus Ah Um",
        sortTitle: "Mingus Ah Um",
        releaseYear: 1959,
        artworkUrl: getReleaseGroupArtworkUrl(
            "48ec720b-2fc2-35dd-8130-5b186c4abcbc"
        ),
        musicbrainzReleaseGroupId:
            "48ec720b-2fc2-35dd-8130-5b186c4abcbc",
        createdAt: "2026-06-05T13:22:00.000Z",
        updatedAt: "2026-09-27T16:05:00.000Z",
        artists: [
            {
                id: "artist-charles-mingus",
                musicbrainzId:
                    "f3b8e107-abe8-4743-b6a3-4a4ee995e71f",
                name: "Charles Mingus",
                sortName: "Mingus, Charles",
                country: "US",
                role: "primary",
                position: 0,
            },
        ],
        genres: [
            {
                id: "genre-hard-bop",
                name: "Hard Bop",
                parentGenreId: "genre-jazz",
                isPrimary: true,
            },
            {
                id: "genre-post-bop",
                name: "Post-Bop",
                parentGenreId: "genre-jazz",
                isPrimary: false,
            },
        ],
        instruments: [
            {
                id: "instrument-double-bass",
                name: "Double Bass",
                notes: "Charles Mingus",
                categories: ["strings"],
            },
            {
                id: "instrument-tenor-saxophone",
                name: "Tenor Saxophone",
                notes: "Booker Ervin",
                categories: ["woodwind"],
            },
            {
                id: "instrument-alto-saxophone",
                name: "Alto Saxophone",
                notes: "John Handy",
                categories: ["woodwind"],
            },
            {
                id: "instrument-piano",
                name: "Piano",
                notes: "Horace Parlan",
                categories: ["keyboard"],
            },
            {
                id: "instrument-drums",
                name: "Drums",
                notes: "Dannie Richmond",
                categories: ["percussion"],
            },
        ],
        links: [],
        listeningEntries: [
            entry(
                "listen-mingus-ah-um-2",
                8,
                "2026-09-27T16:05:00.000Z",
                "\"Better Git It in Your Soul\" is joy with a sharp edge."
            ),
            entry(
                "listen-mingus-ah-um-1",
                8,
                "2026-04-12T20:30:00.000Z"
            ),
        ],
    },
    {
        id: "album-waltz-for-debby",
        title: "Waltz for Debby",
        sortTitle: "Waltz for Debby",
        releaseYear: 1962,
        artworkUrl: getReleaseGroupArtworkUrl(
            "392e7fcf-5ae9-37f6-b8c9-57901cfbee1f"
        ),
        musicbrainzReleaseGroupId:
            "392e7fcf-5ae9-37f6-b8c9-57901cfbee1f",
        createdAt: "2026-05-19T15:48:00.000Z",
        updatedAt: "2026-10-05T22:02:00.000Z",
        artists: [
            {
                id: "artist-bill-evans-trio",
                musicbrainzId:
                    "d0630a08-3b40-4cb4-9f48-7d525262c1f6",
                name: "Bill Evans Trio",
                sortName: "Evans, Bill, Trio",
                country: "US",
                role: "primary",
                position: 0,
            },
            {
                id: "artist-scott-lafaro",
                musicbrainzId:
                    "97cc902a-2850-4db8-8218-186f3b5a1ea5",
                name: "Scott LaFaro",
                sortName: "LaFaro, Scott",
                country: "US",
                role: "other",
                position: 1,
            },
            {
                id: "artist-paul-motian",
                musicbrainzId:
                    "9be59e25-f609-46b2-90cb-2db39b1a1910",
                name: "Paul Motian",
                sortName: "Motian, Paul",
                country: "US",
                role: "other",
                position: 2,
            },
        ],
        genres: [
            {
                id: "genre-cool-jazz",
                name: "Cool Jazz",
                parentGenreId: "genre-jazz",
                isPrimary: true,
            },
            {
                id: "genre-piano-jazz",
                name: "Piano Jazz",
                parentGenreId: "genre-jazz",
                isPrimary: false,
            },
        ],
        instruments: [
            {
                id: "instrument-piano",
                name: "Piano",
                notes: "Bill Evans",
                categories: ["keyboard"],
            },
            {
                id: "instrument-double-bass",
                name: "Double Bass",
                notes: "Scott LaFaro",
                categories: ["strings"],
            },
            {
                id: "instrument-drums",
                name: "Drums",
                notes: "Paul Motian",
                categories: ["percussion"],
            },
        ],
        links: [],
        listeningEntries: [
            entry(
                "listen-waltz-for-debby-2",
                9,
                "2026-10-05T22:02:00.000Z",
                "The companion to Sunday at the Village Vanguard. LaFaro is everywhere."
            ),
            entry(
                "listen-waltz-for-debby-1",
                9,
                "2026-02-18T23:25:00.000Z"
            ),
        ],
    },
    {
        id: "album-saxophone-colossus",
        title: "Saxophone Colossus",
        sortTitle: "Saxophone Colossus",
        releaseYear: 1957,
        artworkUrl: getReleaseGroupArtworkUrl(
            "cf29d6a2-a18a-3bb6-a861-495148baee1f"
        ),
        musicbrainzReleaseGroupId:
            "cf29d6a2-a18a-3bb6-a861-495148baee1f",
        createdAt: "2026-04-24T10:16:00.000Z",
        updatedAt: "2026-09-09T18:55:00.000Z",
        artists: [
            {
                id: "artist-sonny-rollins",
                musicbrainzId:
                    "3b47247e-5b57-49b6-a0ed-bad80243802a",
                name: "Sonny Rollins",
                sortName: "Rollins, Sonny",
                country: "US",
                role: "primary",
                position: 0,
            },
        ],
        genres: [
            {
                id: "genre-hard-bop",
                name: "Hard Bop",
                parentGenreId: "genre-jazz",
                isPrimary: true,
            },
            {
                id: "genre-bebop",
                name: "Bebop",
                parentGenreId: "genre-jazz",
                isPrimary: false,
            },
        ],
        instruments: [
            {
                id: "instrument-tenor-saxophone",
                name: "Tenor Saxophone",
                notes: "Sonny Rollins",
                categories: ["woodwind"],
            },
            {
                id: "instrument-piano",
                name: "Piano",
                notes: "Tommy Flanagan",
                categories: ["keyboard"],
            },
            {
                id: "instrument-double-bass",
                name: "Double Bass",
                notes: "Doug Watkins",
                categories: ["strings"],
            },
            {
                id: "instrument-drums",
                name: "Drums",
                notes: "Max Roach",
                categories: ["percussion"],
            },
        ],
        links: [],
        listeningEntries: [
            entry(
                "listen-saxophone-colossus-2",
                8,
                "2026-09-09T18:55:00.000Z",
                "\"St. Thomas\" never gets old."
            ),
            entry(
                "listen-saxophone-colossus-1",
                7,
                "2026-03-24T19:20:00.000Z"
            ),
        ],
    },
    {
        id: "album-journey-in-satchidananda",
        title: "Journey in Satchidananda",
        sortTitle: "Journey in Satchidananda",
        releaseYear: 1971,
        artworkUrl: getReleaseGroupArtworkUrl(
            "cf154081-2678-3778-95cf-cd31c4ea5dfe"
        ),
        musicbrainzReleaseGroupId:
            "cf154081-2678-3778-95cf-cd31c4ea5dfe",
        createdAt: "2026-08-30T12:05:00.000Z",
        updatedAt: "2026-10-25T22:48:00.000Z",
        artists: [
            {
                id: "artist-alice-coltrane",
                musicbrainzId:
                    "d24fc285-7b2f-47da-8ac5-4070b08570b1",
                name: "Alice Coltrane",
                sortName: "Coltrane, Alice",
                country: "US",
                role: "primary",
                position: 0,
            },
            {
                id: "artist-pharoah-sanders",
                musicbrainzId:
                    "b3a0912a-a62a-4388-9368-7cb21ed5caf9",
                name: "Pharoah Sanders",
                sortName: "Sanders, Pharoah",
                country: "US",
                role: "featured",
                position: 1,
            },
        ],
        genres: [
            {
                id: "genre-spiritual-jazz",
                name: "Spiritual Jazz",
                parentGenreId: "genre-jazz",
                isPrimary: true,
            },
            {
                id: "genre-avant-garde-jazz",
                name: "Avant-Garde Jazz",
                parentGenreId: "genre-jazz",
                isPrimary: false,
            },
        ],
        instruments: [
            {
                id: "instrument-harp",
                name: "Harp",
                notes: "Alice Coltrane",
                categories: ["strings"],
            },
            {
                id: "instrument-soprano-saxophone",
                name: "Soprano Saxophone",
                notes: "Pharoah Sanders",
                categories: ["woodwind"],
            },
            {
                id: "instrument-tanpura",
                name: "Tanpura",
                notes: null,
                categories: ["strings"],
            },
            {
                id: "instrument-double-bass",
                name: "Double Bass",
                notes: "Cecil McBee",
                categories: ["strings"],
            },
            {
                id: "instrument-drums",
                name: "Drums",
                notes: "Rashied Ali",
                categories: ["percussion"],
            },
        ],
        links: [],
        listeningEntries: [
            entry(
                "listen-journey-in-satchidananda-3",
                10,
                "2026-10-25T22:48:00.000Z",
                "Deep, unhurried, and completely its own world."
            ),
            entry(
                "listen-journey-in-satchidananda-2",
                9,
                "2026-08-08T21:30:00.000Z"
            ),
            entry(
                "listen-journey-in-satchidananda-1",
                9,
                "2026-01-19T23:12:00.000Z"
            ),
        ],
    },
    {
        id: "album-speak-no-evil",
        title: "Speak No Evil",
        sortTitle: "Speak No Evil",
        releaseYear: 1965,
        artworkUrl: null,
        musicbrainzReleaseGroupId:
            "eae0c18f-f2fd-3b97-8631-3f682a2f3957",
        createdAt: "2026-09-21T08:44:00.000Z",
        updatedAt: "2026-09-30T17:18:00.000Z",
        artists: [
            {
                id: "artist-wayne-shorter",
                musicbrainzId:
                    "2379937f-6e0d-46a2-b8ff-633fafd72002",
                name: "Wayne Shorter",
                sortName: "Shorter, Wayne",
                country: "US",
                role: "primary",
                position: 0,
            },
        ],
        genres: [
            {
                id: "genre-post-bop",
                name: "Post-Bop",
                parentGenreId: "genre-jazz",
                isPrimary: true,
            },
            {
                id: "genre-modal-jazz",
                name: "Modal Jazz",
                parentGenreId: "genre-jazz",
                isPrimary: false,
            },
        ],
        instruments: [
            {
                id: "instrument-tenor-saxophone",
                name: "Tenor Saxophone",
                notes: "Wayne Shorter",
                categories: ["woodwind"],
            },
            {
                id: "instrument-trumpet",
                name: "Trumpet",
                notes: "Freddie Hubbard",
                categories: ["brass"],
            },
            {
                id: "instrument-piano",
                name: "Piano",
                notes: "Herbie Hancock",
                categories: ["keyboard"],
            },
            {
                id: "instrument-double-bass",
                name: "Double Bass",
                notes: "Ron Carter",
                categories: ["strings"],
            },
            {
                id: "instrument-drums",
                name: "Drums",
                notes: "Elvin Jones",
                categories: ["percussion"],
            },
        ],
        links: [],
        listeningEntries: [
            entry(
                "listen-speak-no-evil-1",
                9,
                "2026-09-30T17:18:00.000Z",
                "Dense and lyrical at once."
            ),
        ],
    },
    {
        id: "album-shape-of-jazz-to-come",
        title: "The Shape of Jazz to Come",
        sortTitle: "Shape of Jazz to Come, The",
        releaseYear: 1959,
        artworkUrl: getReleaseGroupArtworkUrl(
            "5879cfca-e1d0-3ef4-8014-3b284832ed18"
        ),
        musicbrainzReleaseGroupId:
            "5879cfca-e1d0-3ef4-8014-3b284832ed18",
        createdAt: "2026-10-12T09:30:00.000Z",
        updatedAt: "2026-10-12T09:30:00.000Z",
        artists: [
            {
                id: "artist-ornette-coleman",
                musicbrainzId:
                    "169c0d1b-fcb8-4a43-9097-829aa7b39205",
                name: "Ornette Coleman",
                sortName: "Coleman, Ornette",
                country: "US",
                role: "primary",
                position: 0,
            },
        ],
        genres: [
            {
                id: "genre-free-jazz",
                name: "Free Jazz",
                parentGenreId: "genre-avant-garde-jazz",
                isPrimary: true,
            },
            {
                id: "genre-avant-garde-jazz",
                name: "Avant-Garde Jazz",
                parentGenreId: "genre-jazz",
                isPrimary: false,
            },
        ],
        instruments: [
            {
                id: "instrument-alto-saxophone",
                name: "Alto Saxophone",
                notes: "Ornette Coleman",
                categories: ["woodwind"],
            },
            {
                id: "instrument-trumpet",
                name: "Trumpet",
                notes: "Don Cherry",
                categories: ["brass"],
            },
            {
                id: "instrument-double-bass",
                name: "Double Bass",
                notes: "Charlie Haden",
                categories: ["strings"],
            },
            {
                id: "instrument-drums",
                name: "Drums",
                notes: "Billy Higgins",
                categories: ["percussion"],
            },
        ],
        links: [],
        listeningEntries: [],
    },
    {
        id: "album-duke-ellington-john-coltrane",
        title: "Duke Ellington & John Coltrane",
        sortTitle: "Ellington, Duke & John Coltrane",
        releaseYear: 1963,
        artworkUrl: getReleaseGroupArtworkUrl(
            "4f64c4fc-1de9-3b28-970c-e86f78c631be"
        ),
        musicbrainzReleaseGroupId:
            "4f64c4fc-1de9-3b28-970c-e86f78c631be",
        createdAt: "2026-08-02T14:20:00.000Z",
        updatedAt: "2026-10-01T20:26:00.000Z",
        artists: [
            {
                id: "artist-duke-ellington",
                musicbrainzId:
                    "3af06bc4-68ad-4cae-bb7a-7eeeb45e411f",
                name: "Duke Ellington",
                sortName: "Ellington, Duke",
                country: "US",
                role: "primary",
                position: 0,
            },
            {
                id: "artist-john-coltrane",
                musicbrainzId:
                    "b625448e-bf4a-41c3-a421-72ad46cdb831",
                name: "John Coltrane",
                sortName: "Coltrane, John",
                country: "US",
                role: "primary",
                position: 1,
            },
        ],
        genres: [
            {
                id: "genre-post-bop",
                name: "Post-Bop",
                parentGenreId: "genre-jazz",
                isPrimary: true,
            },
            {
                id: "genre-cool-jazz",
                name: "Cool Jazz",
                parentGenreId: "genre-jazz",
                isPrimary: false,
            },
        ],
        instruments: [
            {
                id: "instrument-piano",
                name: "Piano",
                notes: "Duke Ellington",
                categories: ["keyboard"],
            },
            {
                id: "instrument-tenor-saxophone",
                name: "Tenor Saxophone",
                notes: "John Coltrane",
                categories: ["woodwind"],
            },
            {
                id: "instrument-double-bass",
                name: "Double Bass",
                notes: "Aaron Bell and Jimmy Garrison",
                categories: ["strings"],
            },
            {
                id: "instrument-drums",
                name: "Drums",
                notes: "Sam Woodyard and Elvin Jones",
                categories: ["percussion"],
            },
        ],
        links: [],
        listeningEntries: [
            entry(
                "listen-duke-ellington-john-coltrane-1",
                8,
                "2026-10-01T20:26:00.000Z",
                "\"In a Sentimental Mood\" is the obvious favorite for a reason."
            ),
        ],
    },
    {
        id: "album-getz-gilberto",
        title: "Getz/Gilberto",
        sortTitle: "Getz/Gilberto",
        releaseYear: 1964,
        artworkUrl: getReleaseGroupArtworkUrl(
            "b248d212-aace-3c3e-a23d-e13aaac1f87a"
        ),
        musicbrainzReleaseGroupId:
            "b248d212-aace-3c3e-a23d-e13aaac1f87a",
        createdAt: "2026-03-11T17:34:00.000Z",
        updatedAt: "2026-09-18T20:44:00.000Z",
        artists: [
            {
                id: "artist-stan-getz",
                musicbrainzId:
                    "8f2422ab-0ec6-4c92-80c4-afe9622fab32",
                name: "Stan Getz",
                sortName: "Getz, Stan",
                country: "US",
                role: "primary",
                position: 0,
            },
            {
                id: "artist-joao-gilberto",
                musicbrainzId:
                    "286ec4c2-b5ca-4f85-b331-280a6d73dd14",
                name: "João Gilberto",
                sortName: "Gilberto, João",
                country: "BR",
                role: "primary",
                position: 1,
            },
            {
                id: "artist-antonio-carlos-jobim",
                musicbrainzId:
                    "7a8dbe84-f4c0-4457-bfa3-edced1f8cde0",
                name: "Antônio Carlos Jobim",
                sortName: "Jobim, Antônio Carlos",
                country: "BR",
                role: "featured",
                position: 2,
            },
        ],
        genres: [
            {
                id: "genre-bossa-nova",
                name: "Bossa Nova",
                parentGenreId: "genre-latin-jazz",
                isPrimary: true,
            },
            {
                id: "genre-cool-jazz",
                name: "Cool Jazz",
                parentGenreId: "genre-jazz",
                isPrimary: false,
            },
        ],
        instruments: [
            {
                id: "instrument-tenor-saxophone",
                name: "Tenor Saxophone",
                notes: "Stan Getz",
                categories: ["woodwind"],
            },
            {
                id: "instrument-guitar",
                name: "Guitar",
                notes: "João Gilberto",
                categories: ["strings"],
            },
            {
                id: "instrument-piano",
                name: "Piano",
                notes: "Antônio Carlos Jobim",
                categories: ["keyboard"],
            },
            {
                id: "instrument-double-bass",
                name: "Double Bass",
                notes: "Tommy Williams",
                categories: ["strings"],
            },
            {
                id: "instrument-drums",
                name: "Drums",
                notes: "Milton Banana",
                categories: ["percussion"],
            },
            {
                id: "instrument-voice",
                name: "Voice",
                notes: "Astrud Gilberto and João Gilberto",
                categories: ["voice"],
            },
        ],
        links: [],
        listeningEntries: [
            entry(
                "listen-getz-gilberto-2",
                9,
                "2026-09-18T20:44:00.000Z",
                "Astrud's voice is the whole mood."
            ),
            entry(
                "listen-getz-gilberto-1",
                8,
                "2026-06-01T18:30:00.000Z"
            ),
        ],
    },
];
