# JazzLog

A personal jazz listening journal for cataloging albums, recording ratings and notes, and exploring a personal listening history.

## Project goals

Build a lightweight, minimalist web app to replace an Apple Notes-based listening log.

Core functionality:
- Search for albums and import available metadata and artwork.
- Log listens with a rating, optional notes, and instrumentation.
- Categorize albums by genre and subgenre.
- Browse, search, filter, and sort a personal album library.
- View album details and listening history.

The app is initially for personal use, but its data model should support multiple users.

## Technology

| Area | Choice |
|---|---|
| Frontend | Vanilla HTML, CSS, TypeScript |
| Build tooling | Vite |
| Hosting | Cloudflare Workers |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth |
| Album metadata | MusicBrainz |
| Album artwork | Cover Art Archive |

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

| Rating | Description |
|---:|---|
| 1 | Get this away from me |
| 2 | Actively unpleasant |
| 3 | Not for me |
| 4 | Pretty forgettable |
| 5 | Some good, some snooze |
| 6 | Solid listen |
| 7 | Glad I heard it |
| 8 | Excellent album |
| 9 | Nearly a classic |
| 10 | Inject this into my bloodstream |

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

**Current status:** Design complete. Implementation has not started.