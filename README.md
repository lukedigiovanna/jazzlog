# JazzLog

A personal jazz listening journal for cataloging albums, recording ratings and notes, and exploring a personal listening history.

## Project goals

Build a lightweight, minimalist web app to replace an Apple Notes-based listening log.

Core functionality:

- Search for albums and import available metadata and artwork.
- Log listens with a rating and optional notes; track instrumentation on albums.
- Categorize albums by genre and subgenre.
- Browse, search, filter, and sort a personal album library.
- View album details and listening history.

The app is initially for personal use, but its data model should support multiple users.

## Technology

| Area           | Choice                        |
| -------------- | ----------------------------- |
| Frontend       | Vanilla HTML, CSS, TypeScript |
| Build tooling  | Vite                          |
| Hosting        | Cloudflare Workers            |
| Database       | Supabase PostgreSQL           |
| Authentication | Supabase Auth                 |
| Album metadata | MusicBrainz                   |
| Album artwork  | Cover Art Archive             |

No frontend framework or separately hosted application backend. The browser communicates with Supabase directly, with access controlled by Row Level Security (RLS).

## Product decisions

- **Single-page application:** Start with one library view and streamlined album-logging workflow. No router or tabbed navigation initially.
- **Personal catalog:** Albums and artists are user-owned records, not entries in a shared global catalog.
- **Canonical albums:** Track original albums and their original release years, rather than individual editions.
- **Listening history:** Each listen creates a new entry. Albums are not duplicated when listened to again.
- **Latest rating:** The library displays an album's most recent rating; previous ratings remain in its listening history.
- **Editable metadata:** External metadata is a starting point. Users can correct and customize it.
- **Instrumentation:** Support manual instrument selection and editing; automatic metadata may be incomplete.
- **Genres:** Support multiple genres per album, including hierarchical genre/subgenre relationships.

## Rating scale

Ratings are integers from 1–10:

| Rating | Description                     |
| -----: | ------------------------------- |
|      1 | Get this away from me           |
|      2 | Actively unpleasant             |
|      3 | Not for me                      |
|      4 | Pretty forgettable              |
|      5 | Some good, some snooze          |
|      6 | Solid listen                    |
|      7 | Glad I heard it                 |
|      8 | Excellent album                 |
|      9 | Nearly a classic                |
|     10 | Inject this into my bloodstream |

## Design direction

An understated personal music journal, not a Spotify clone or an administrative dashboard.

- Minimal, responsive interface.
- Dark theme initially.
- Charcoal, muted sage, and warm off-white palette.
- Album artwork as the primary visual accent.
- Restrained typography, borders, shadows, and animation.
- Comfortable on both desktop and mobile.

## Data and security

Use Supabase Auth and PostgreSQL. User-owned records should include a `user_id`, with RLS policies enforcing ownership.

The initial data model will cover:

- Profiles
- Artists and albums
- Album–artist relationships
- Listening entries
- Genres and album–genre relationships
- Instruments and album–instrument relationships

Never expose Supabase service-role credentials in the frontend.

## Development milestones

Work through these milestones sequentially. Each will receive its own detailed implementation plan before work begins.

- [ ] **1. Boilerplate:** Project setup, tooling, and initial application shell.
- [ ] **2. Data:** Supabase setup, schema, authentication, and security policies.
- [ ] **3. Integrations:** MusicBrainz search, metadata, and album artwork.
- [ ] **4. UI:** Library, album search, logging workflow, and album details.
- [ ] **5. Polish:** Responsive design, PWA support, testing, and refinements.
- [ ] **6. Deployment:** Production configuration and Cloudflare deployment.

## Future possibilities

Explicitly outside the initial scope; consider only after the core app is working:

- Listening queue.
- Insights and analytics, including genre exploration.
- Data export, import, and backup/restore.
- Offline browsing and listening-entry synchronization.
- Light theme and additional customization.
- Recommendations based on listening history.

## Development principles

- Keep the application simple and avoid unnecessary dependencies.
- Prefer vanilla TypeScript and straightforward architecture.
- Build incrementally; avoid implementing future features prematurely.
- Keep this README updated as project scope and milestone completion evolve.
- Document detailed implementation decisions in separate milestone plans.

**Current status:** Email/password sign-in and sign-up are connected to Supabase Auth, including confirmation email redirects, persisted sessions, and sign-out across tabs. Signed-in users fetch their albums, artist credits, genres, instruments, music links, and listening history from Supabase under the existing RLS policies. Artist, genre, and instrument catalogs include unused records. Account libraries are read only for now; create, update, and delete integration comes next. Loading failures offer retry and sign-out without falling back to demo records. Demo visitors continue to use separate browser fixtures. MusicBrainz and Cover Art Archive integration remain separate work.

Run `npm install` and `npm run dev` to open the app. Run `npm run build` to check TypeScript and create the production bundle.

For authentication, configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in your local `.env`, then restart Vite. Environment files are ignored by Git. Use the public publishable key, never a service-role key. Without configuration, the demo remains available.

In the hosted Supabase project's Authentication → URL Configuration, set the production Site URL and allow the development URL (normally `http://localhost:5173/`, or `http://127.0.0.1:5173/` if using that host). Signup confirmation emails return to the current origin and pathname, which must be allowed by Supabase. Local Supabase configuration uses Vite's default port 5173. No hosted settings or migrations are changed by the frontend.

Auth verification uses mocked Supabase HTTP responses to cover signup confirmation and redirects, invalid credentials, successful sign-in, session restoration after reload, sign-out propagation between tabs, and demo entry/exit. Live account creation and email delivery require verification against your configured Supabase project.

Run `npm run format` to format the project with Prettier, or `npm run format:check` to check formatting without changing files.

The demo includes library search, genre filters, sorting, grid/list layouts, album details, listening history, half-star ratings (stored as integers from 1–10), catalog result review, manual entry, album editing, music links, and an instrument catalog with category filters, album usage, and deletion of unused instruments. Edits persist in this browser under `jazzlog-demo-v1`; remove that localStorage key to restore the fixtures. If storage is unavailable, changes last for the current visit.

Instruments are stored independently of albums in the same demo snapshot. Existing album-only snapshots migrate automatically, preserving uncategorized instruments. Removing an instrument from an album keeps it in your catalog; renaming or recategorizing it updates all album appearances.

The illustrated SVG covers in `public/art/` and the catalog in `src/data/mockData.ts` are demo fixtures. `sourceId` and `recordLabel` are optional UI/demo metadata; they do not introduce database schema changes. The reference handoff stays separate from the application source.

See [UI verification](docs/implementation/ui-verification.md) for the browser checks performed.
