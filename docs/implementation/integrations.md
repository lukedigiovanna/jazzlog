# JazzLog — Milestone 3: Integrations

## Objective

Connect the JazzLog frontend to Supabase, MusicBrainz, and Cover Art Archive.

This milestone focuses on establishing reliable integration boundaries. We are not building the actual library interface yet.

By the end, JazzLog should be able to:

- Connect to Supabase using the publishable key.
- Authenticate a user and maintain their session.
- Read and write user-owned album records.
- Search MusicBrainz for canonical albums (release groups).
- Normalize MusicBrainz responses into JazzLog-owned TypeScript types.
- Retrieve album artwork from Cover Art Archive.
- Complete a basic metadata-to-database round trip.

## Architecture

We will retain our existing architecture:

- Browser → Supabase for authentication and ordinary database operations.
- Browser → Cloudflare Worker → MusicBrainz for metadata searches.
- Browser → Cover Art Archive for artwork URLs.
- Supabase PostgreSQL remains the source of truth for JazzLog data.

The MusicBrainz Worker endpoint is a small exception to our direct-browser-access approach. MusicBrainz requires an identifiable User-Agent, which browser JavaScript cannot freely customize. The Worker can provide that application identity and act as a controlled proxy.

## Expected project structure

We will add files incrementally:

```text
jazzlog/
├── src/
│   ├── lib/
│   │   └── supabase.ts
│   ├── services/
│   │   ├── auth.ts
│   │   ├── albums.ts
│   │   ├── musicbrainz.ts
│   │   └── cover-art.ts
│   ├── types/
│   │   ├── album.ts
│   │   └── musicbrainz.ts
│   ├── main.ts
│   └── styles/
│       └── main.css
├── worker/
│   └── index.ts
├── supabase/
│   └── migrations/
├── .env.example
├── .env.local
├── wrangler.jsonc
└── package.json
```

Some existing files may already be present. We should modify those rather than recreate them.

---

# Part 1 — Supabase client

### 1. Install the Supabase JavaScript library

From the project root:

```powershell
npm install @supabase/supabase-js
```

This gives us the official JavaScript client for authentication and database access.

### 2. Configure environment variables

Create `.env.local` in the project root:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
VITE_MUSICBRAINZ_API_URL=/api/musicbrainz
```

Find the project URL and publishable key in your Supabase Dashboard.

Important security distinction:

- The publishable key is designed to be exposed in frontend applications.
- The service role key must never be included in frontend code or Vite environment variables.

Our RLS policies provide the actual data-access protection.

Create `.env.example` with the same variable names but placeholder values. This documents the configuration required by anyone setting up the project.

Verify that `.env.local` is ignored by Git:

```powershell
git check-ignore .env.local
```

If it is not ignored, add it to `.gitignore`.

### 3. Create the Supabase client

Create `src/lib/supabase.ts`.

Responsibilities:

- Read the Vite environment variables.
- Validate that the required variables exist.
- Initialize a single Supabase client.
- Export that client for reuse throughout the application.

We should only create one client instance. Authentication state and database operations should share it.

### 4. Verify the connection

Temporarily import the client from `src/main.ts`.

Use it to retrieve the current authenticated user:

```typescript
const { data, error } = await supabase.auth.getUser();
```

At this point, being unauthenticated is expected. We are primarily checking that the client initializes and can communicate with Supabase.

**Completion criteria:**

- The application starts successfully.
- No missing environment variable errors.
- The Supabase client initializes.
- A request reaches Supabase successfully.

---

# Part 2 — Authentication

We need authentication before testing user-owned database operations.

### 5. Configure Supabase Auth

In the Supabase Dashboard, inspect the Authentication settings.

Configure:

- Email/password authentication.
- Local development redirect URL: `http://localhost:5173`.
- Production redirect URL: our eventual Cloudflare Workers application URL.

Email confirmation can remain enabled. If enabled, remember that a newly registered account may need to confirm its email before signing in.

### 6. Implement the authentication service

Create `src/services/auth.ts`.

This module should expose a small set of functions:

| Function                      | Responsibility                      |
| ----------------------------- | ----------------------------------- |
| `signUp(email, password)`     | Register a new user                 |
| `signIn(email, password)`     | Authenticate an existing user       |
| `signOut()`                   | End the current session             |
| `getCurrentUser()`            | Retrieve the authenticated user     |
| `getSession()`                | Retrieve the current session        |
| `onAuthStateChange(callback)` | Subscribe to authentication changes |

The service should delegate to the Supabase client rather than implementing authentication logic itself.

Return useful errors to callers. Avoid swallowing errors or logging passwords and tokens.

### 7. Verify session persistence

Test the following:

1. Register or create a test user.
2. Sign in.
3. Retrieve the current user.
4. Reload the browser.
5. Retrieve the current user again.
6. Sign out.
7. Confirm that the session is gone.

The Supabase client persists sessions in browser storage by default. We should rely on its built-in session handling rather than implementing our own.

### 8. Verify the profile trigger

Our database migration created a trigger that automatically creates a `profiles` row when a new Supabase Auth user is created.

Check the `profiles` table in Supabase after registering a user.

Confirm:

- A corresponding profile exists.
- Its `id` matches the Auth user's ID.
- The profile was created automatically, without a separate frontend insert.

**Completion criteria:**

- Sign-up and sign-in work.
- Sessions persist across reloads.
- Sign-out works.
- The profile trigger works.

We are not building a login screen in this milestone. Authentication can be exercised temporarily through a development-only test harness or browser console.

---

# Part 3 — Basic database operations

### 9. Create the album service

Create `src/services/albums.ts`.

This module will contain application-facing database operations for albums.

Initially, implement:

| Function                   | Responsibility                     |
| -------------------------- | ---------------------------------- |
| `getAlbums()`              | Retrieve the current user's albums |
| `getAlbumById(id)`         | Retrieve one album                 |
| `createAlbum(album)`       | Insert an album                    |
| `updateAlbum(id, updates)` | Update editable album fields       |
| `deleteAlbum(id)`          | Delete an album                    |

Use the Supabase client directly.

Keep the database-specific query logic inside this service. The eventual UI should not need to know how Supabase queries are constructed.

### 10. Respect ownership

Our database schema requires a `user_id` on user-owned records.

When inserting an album:

1. Retrieve the current authenticated user.
2. Use their Auth user ID as `user_id`.
3. Insert the album.
4. Return the inserted record.

Do not accept an arbitrary `user_id` from a future UI form.

RLS remains the security boundary. The frontend's ownership checks are for correctness and convenience, not security.

### 11. Test database operations

Create a temporary test album, such as:

- Title: `Test Album`
- Sort title: `Test Album`
- Release year: `2026`

Then:

1. Insert the album.
2. Retrieve it.
3. Update its title.
4. Retrieve it again.
5. Delete it.

Check the Supabase Table Editor to confirm the operations.

Also verify that unauthenticated requests cannot read or modify user-owned records.

**Completion criteria:**

- Authenticated album CRUD works.
- The correct `user_id` is assigned.
- RLS prevents unauthorized access.
- Errors are propagated to the caller.

---

# Part 4 — MusicBrainz integration

### 12. Establish the MusicBrainz Worker endpoint

Create `worker/index.ts`.

This Worker will expose a narrowly scoped endpoint:

```text
GET /api/musicbrainz/release-groups?q=album+title
```

Its responsibilities:

1. Accept a search query.
2. Validate that the query is present and reasonably sized.
3. Construct a request to the MusicBrainz release-group search endpoint.
4. Include a meaningful User-Agent identifying JazzLog and a contact method.
5. Request JSON.
6. Return the response to the browser.
7. Handle upstream errors without exposing unnecessary internal details.

Do not make this a generic URL proxy. The Worker should only forward requests to the MusicBrainz endpoint we actually need.

### 13. Update the Cloudflare Worker configuration

Our existing Worker currently serves the Vite-built static assets.

Update `wrangler.jsonc` to include the Worker entry point and configure API requests to reach the Worker before static asset handling.

The intended behavior:

- `/api/*` → Worker code.
- Other paths → static assets in `dist`.

Use Cloudflare's `run_worker_first` asset configuration for the API path.

Preserve the existing static asset configuration and deployment settings.

### 14. Respect MusicBrainz rate limits

MusicBrainz asks applications to make no more than one request per second.

We should implement:

- A debounced search at the application level.
- A serialized request queue with at least 1,100 ms between outbound requests.
- Sensible handling of HTTP 503 responses.
- No automatic rapid retry loops.

For this personal application, a single-user request queue is sufficient to start. If we ever turn JazzLog into a multi-user application, we should revisit globally coordinated rate limiting.

### 15. Define MusicBrainz response types

Create `src/types/musicbrainz.ts`.

Define only the fields we actually use from the API.

For release-group search results, we care about:

- Release-group MBID.
- Title.
- First release date.
- Primary type.
- Artist credits.
  - Artist MBID.
  - Artist name.
  - Credited name.
  - Join phrase.

Avoid typing the entire MusicBrainz API response. We should model the subset our application consumes.

### 16. Define our own album type

Create `src/types/album.ts`.

Define a normalized `AlbumCandidate` type representing a potential album to add to JazzLog.

It should contain:

- MusicBrainz release-group ID.
- Album title.
- First release year, if available.
- Artist credits.
- Artwork URL, if available.

This type should not depend on MusicBrainz's raw response structure.

The distinction is important:

**MusicBrainz response → JazzLog AlbumCandidate → Supabase album record**

If MusicBrainz changes its response format, we should only need to update the integration layer.

### 17. Implement the MusicBrainz service

Create `src/services/musicbrainz.ts`.

Expose:

```typescript
searchReleaseGroups(query: string): Promise<AlbumCandidate[]>
```

Responsibilities:

1. Call our Cloudflare Worker endpoint.
2. Parse the JSON response.
3. Normalize release-group results.
4. Handle missing or malformed optional fields.
5. Return an array of `AlbumCandidate` objects.

Search should prioritize release groups, not individual releases.

This matches our database model: one canonical album represents the original album, rather than each pressing, remaster, or regional edition.

For artist credits, preserve the credited names and join phrases. MusicBrainz credits do not always provide a reliable distinction between our `primary`, `featured`, and `other` roles, so do not pretend that we can infer every role perfectly. We can initially treat the returned release-group credits as primary credits and allow manual correction later.

**Completion criteria:**

- Searching for an album returns release-group results.
- Results include title, year, and artist credits when available.
- The normalized result does not expose raw API response objects.
- Search errors are handled cleanly.
- Requests respect the rate limit.

---

# Part 5 — Cover Art Archive

### 18. Implement the artwork service

Create `src/services/cover-art.ts`.

Expose:

```typescript
getArtworkUrl(releaseGroupId: string): string
```

For a release group, construct the Cover Art Archive front-cover endpoint:

```text
https://coverartarchive.org/release-group/{MBID}/front-500
```

The endpoint redirects to the actual image.

Use the 500-pixel image for the initial application. It should be a reasonable balance between quality and download size for album thumbnails.

### 19. Handle missing artwork

Not every release group has artwork.

The service should not assume an image exists simply because a MusicBrainz ID exists.

For now:

- Return the expected artwork URL.
- Allow the eventual UI to display a placeholder if the image fails to load.
- Do not make artwork a required field when saving an album.

We can add more sophisticated artwork fallback behavior later if necessary.

### 20. Test artwork retrieval

Test with a few known albums:

- One with readily available artwork.
- One with a different release-group ID.
- One without available artwork, if you can find an example.

Confirm that the endpoint redirects to a usable image and that missing artwork does not break the application.

---

# Part 6 — End-to-end integration test

This is the final and most important part of the milestone.

### 21. Test the complete workflow

Using a temporary development test harness:

1. Authenticate with Supabase.
2. Search MusicBrainz for an album.
3. Inspect the returned normalized `AlbumCandidate`.
4. Retrieve its artwork URL.
5. Save the album to Supabase.
6. Retrieve the saved album from Supabase.
7. Confirm the MusicBrainz release-group ID and artwork URL were persisted.

Use a real album that you know well so you can easily recognize incorrect metadata.

Do not build the finished album-search interface yet. A temporary test harness is enough.

### 22. Clean up

Once the tests pass:

- Remove temporary test code.
- Remove debug logging.
- Keep reusable services and types.
- Confirm `.env.local` is not tracked by Git.
- Run the production build.
- Confirm the application still deploys to Cloudflare.

Commit the milestone:

```powershell
git add .
git commit -m "Integrate Supabase and music metadata services"
```

---

# Completion checklist

## Supabase

- [ ] Supabase client initialized.
- [ ] Environment variables configured.
- [ ] Authentication works.
- [ ] Session persists across reloads.
- [ ] Profile trigger verified.
- [ ] Album CRUD works.
- [ ] RLS behavior verified.

## MusicBrainz

- [ ] Cloudflare Worker endpoint implemented.
- [ ] MusicBrainz User-Agent configured.
- [ ] Rate limiting respected.
- [ ] Release-group search works.
- [ ] API response normalized into JazzLog types.
- [ ] Artist credits preserved.

## Cover Art Archive

- [ ] Artwork URL generation implemented.
- [ ] Artwork successfully retrieved.
- [ ] Missing artwork handled gracefully.

## Final

- [ ] End-to-end metadata-to-database test passes.
- [ ] Production build succeeds.
- [ ] Changes committed to Git.

---

# Explicitly out of scope

We are not implementing the following in this milestone:

- Album search UI.
- Album detail pages.
- Library display.
- Listening history UI.
- Rating controls.
- Genre editing UI.
- Instrument editing UI.
- Automatic genre or instrument enrichment.
- Offline writes or synchronization.
- Insights or listening statistics.

Those belong to later milestones.

**The goal is to finish with a reliable integration layer, not a partially built application interface.**
