# JazzLog — Milestone 4: UI Implementation Plan

## Objective

Build the complete initial JazzLog interface using vanilla HTML, CSS, and TypeScript.

This milestone is focused exclusively on the visual interface and client-side interaction structure.

**Do not integrate real data or services yet.**

Use hardcoded mock data to populate the interface. Buttons and navigation may work locally, but nothing should call Supabase, MusicBrainz, Cover Art Archive, or any other external service.

At the end of this milestone, JazzLog should look and feel like a usable application, even though its data is temporary.

---

# 1. Product and design direction

JazzLog should feel like a personal music journal, not a streaming service or analytics dashboard.

### Visual direction
- Dark charcoal as the primary theme.
- Muted sage as the primary accent.
- Warm off-white for text and lighter surfaces.
- Restrained typography.
- Album artwork as the primary visual accent.
- Generous spacing and relatively few borders.
- Avoid excessive cards, shadows, gradients, and animations.
- Ratings should be visually recognizable and easy to scan.

### UX principles
- Library is the main destination.
- Adding an album and logging a listen should be easy to access.
- Album details should be easy to inspect without excessive navigation.
- Support desktop and mobile layouts.
- Keep interactions keyboard accessible.
- Avoid unnecessary navigation and application complexity.

A light theme can be considered later; initially, implement the dark theme well.

---

# 2. Screen and view inventory

The MVP has four primary views.

These are logical application views, not necessarily separate URLs.

## View 1: Library (main screen)

This is the default screen and the central experience of JazzLog.

### Header
- JazzLog wordmark.
- Main navigation, if needed.
- Prominent "Add album" action.

Keep navigation minimal. The library should remain the obvious focus.

### Library controls
- Search input.
- Sort selector.
- Optional filter controls for genre and rating.
- Display the total number of albums.

For the initial shell, these controls can be visually present without implementing real filtering or sorting.

### Album collection
Display the user's albums in a clean, scannable collection.

Each album should show:
- Cover artwork.
- Album title.
- Primary artist or artists.
- Original release year.
- Latest rating.

Clicking an album opens its detail view.

Prefer a layout that gives artwork sufficient prominence without wasting screen space. Start with a responsive grid or compact list and evaluate it in the browser before committing to the final layout.

### Empty state
Include an empty-library state with a short explanation and an Add album action.

This will be useful later when a new user has no albums.

---

## View 2: Album detail

Selecting an album opens a dedicated detail view.

This can initially be a full-screen view with a back button. The implementation should not require a router.

### Album information
- Large album artwork.
- Album title.
- Artist credits.
- Original release year.
- Genres.
- Instruments.
- Latest rating.

### External listening links
Display optional links to services such as:
- Apple Music.
- YouTube.

These are external destinations, not album identity.

For the shell, use placeholder links or disabled-looking controls. Do not navigate to invented destinations.

### Listening history
Show the album's listening entries, newest first.

Each entry should display:
- Listening date.
- Rating.
- Optional notes.

Historical ratings must remain visible. The latest rating should be visually distinguishable.

### Actions
- Log a listen.
- Edit album metadata.
- Return to library.

The edit action can reuse the album form from the Add album view.

---

## View 3: Add album

This view represents the process of adding an album to the library.

We have already agreed that MusicBrainz search results should be presented for manual selection, rather than automatically trusting the first search result.

The UI should reflect that design even though search is not functional yet.

### Step A: Search

Show:
- Search input.
- Search button or clear search affordance.
- Brief search guidance.

Below the input, display several hardcoded example search results.

Each result should include:
- Artwork.
- Album title.
- Artist.
- Release year.

Selecting a result should open the album editor with that result's mock metadata prefilled.

Do not automatically select the first result.

### Step B: Manual entry

Provide an obvious way to enter an album manually if the desired result isn't found.

Manual entry should not feel like an obscure fallback.

### Step C: Album editor

The editor should support:

**Basic metadata**
- Album title (required).
- Sort title.
- Release year.
- Artists and artist credits.
- Artwork URL.

**Additional metadata**
- Genres.
- Instruments.

For the shell, these fields can use simple static examples and placeholder controls. The final interaction patterns for adding/removing artists, genres, and instruments can be refined later.

### Actions
- Save album.
- Cancel.

For this milestone, Save should only demonstrate a local interaction, such as displaying a confirmation or returning to the library. It must not write to the database.

---

## View 4: Log a listen

Logging a listening entry should be a quick, focused interaction.

I recommend implementing this as a modal or dialog rather than another full-screen page.

### Contents
- Album artwork and title for context.
- Listening date.
- Rating (1–10).
- Optional notes.

Use a clear rating input. A selectable row of numbered values is a reasonable starting point.

### Actions
- Save listening entry.
- Cancel.

For the shell, saving can close the dialog and show a temporary confirmation. No data should persist.

The same dialog should be accessible from both the Library and Album detail views where appropriate.

---

# 3. Application structure

Use vanilla TypeScript with a small, modular architecture.

Do not introduce React, Vue, a component framework, or a routing library.

The goal is to establish a few useful patterns without recreating an entire frontend framework.

## Proposed file structure

```text
src/
  main.ts

  app/
    app.ts
    state.ts
    navigation.ts

  components/
    header.ts
    albumCard.ts
    albumGrid.ts
    rating.ts
    modal.ts

  views/
    libraryView.ts
    albumDetailView.ts
    addAlbumView.ts

  data/
    mockData.ts

  styles/
    main.css
    tokens.css
    layout.css
    components.css
    views.css
```

This structure is a starting point, not a requirement to create every file immediately.

### Responsibilities

**main.ts**
- Application entry point.
- Initialize the application.

**app/app.ts**
- Coordinate application rendering.
- Render the shared application shell.
- Decide which view is currently active.

**app/state.ts**
- Hold temporary UI state.
- Track the current view, selected album, and whether a modal is open.
- No persistent storage.

**app/navigation.ts**
- Handle navigation between views.
- Provide simple functions such as `showLibrary()`, `showAlbum(id)`, and `showAddAlbum()`.

**components/**
- Small reusable rendering functions.
- Examples: album cards, ratings, modals, and headers.

**views/**
- Functions responsible for rendering each major screen.
- Each view should compose smaller components.

**data/mockData.ts**
- Hardcoded sample albums and listening entries.
- Keep mock data separate from rendering logic.

**styles/**
- Separate design tokens, shared layout, reusable components, and view-specific styling.

---

# 4. How to implement the UI without a framework

The application should use a simple render-function approach.

For example:

```ts
export function renderLibraryView(): string {
  return `
    <section class="library-view">
      <h1>Your Library</h1>
      <!-- Library content -->
    </section>
  `;
}
```

A view returns HTML as a string. The application shell decides where that HTML is inserted.

A component can follow the same pattern:

```ts
export function renderAlbumCard(album: Album): string {
  return `
    <article class="album-card" data-album-id="${album.id}">
      <!-- Album information -->
    </article>
  `;
}
```

These functions should generate markup, not make API requests or manage database records.

### Event handling

Use event delegation from a stable application root rather than attaching individual listeners every time a view renders.

For example, an album card can expose:

```html
<article data-action="open-album" data-album-id="album-1">
```

The application handles clicks on the root element, identifies the action, and calls the appropriate navigation function.

This avoids accumulating event listeners whenever the application rerenders.

### State

Keep application state explicit and small.

For example:

```ts
type ViewName =
  | "library"
  | "album-detail"
  | "add-album";

interface AppState {
  currentView: ViewName;
  selectedAlbumId: string | null;
  modal: "log-listen" | null;
}
```

A small state object is sufficient for this milestone.

We do not need a state management library.

### Rendering

Start with full-view rendering when navigation changes.

Do not attempt to build a sophisticated reactive rendering system.

For simple interactions, update only the relevant element where practical. If the implementation starts becoming complicated, favor straightforward rendering over clever abstractions.

---

# 5. Mock data

Create a small collection of realistic jazz albums.

Use approximately 8–12 albums, with varied:
- Artists.
- Release years.
- Artwork.
- Genres.
- Ratings.

Include a few albums with multiple artists and a few with multiple listening entries.

Include some albums with missing artwork or optional metadata to ensure the interface handles incomplete records.

Mock data should roughly resemble the eventual database models. Avoid creating a second, incompatible data model just for the UI.

The data should be entirely local and hardcoded.

Artwork can use the existing Cover Art Archive URL convention for known release-group IDs, or static image placeholders.

---

# 6. Implementation phases

Implement the UI incrementally. Do not attempt to build all views at once.

## Phase 1 — Design foundation and application shell

1. Establish CSS design tokens.
2. Set global typography and base styles.
3. Implement the application shell.
4. Implement the header and primary navigation.
5. Establish responsive page layout.
6. Create the basic application state and rendering entry point.

**Completion criteria:** JazzLog opens in the browser with its visual identity and a functioning application shell.

## Phase 2 — Library

1. Create mock album data.
2. Implement the album card.
3. Implement the album collection layout.
4. Add search, sort, and filter controls visually.
5. Add the empty-library state.
6. Wire album selection to local navigation.

**Completion criteria:** The Library looks like a populated personal jazz collection, and selecting an album opens its detail view.

## Phase 3 — Album detail

1. Implement the album detail layout.
2. Display artwork and album metadata.
3. Display genres and instruments.
4. Display listening history.
5. Add the edit and log-listen actions.
6. Implement navigation back to the library.

**Completion criteria:** An album can be opened, inspected, and navigated away from.

## Phase 4 — Add album

1. Implement the search interface.
2. Create mock MusicBrainz search results.
3. Implement result selection.
4. Implement the manual-entry form.
5. Implement the album editor layout.
6. Add cancel and mock-save interactions.

**Completion criteria:** The complete album-addition experience can be demonstrated without calling MusicBrainz or Supabase.

## Phase 5 — Log a listen

1. Implement the modal.
2. Add date input.
3. Add the 1–10 rating selector.
4. Add optional notes.
5. Add mock-save and cancel interactions.
6. Ensure the modal can be opened from the relevant views.

**Completion criteria:** The listening-entry interaction looks and behaves like a finished feature, without persisting anything.

## Phase 6 — Responsive and interaction polish

1. Test desktop and mobile layouts.
2. Refine spacing and typography.
3. Check artwork sizing and loading placeholders.
4. Check keyboard navigation and focus states.
5. Ensure modals behave correctly.
6. Check empty and incomplete-data states.
7. Remove temporary development code.

**Completion criteria:** All four views are visually coherent and usable at common screen sizes.

---

# 7. Explicitly excluded from this milestone

Do not implement:
- Supabase queries or mutations.
- Authentication flows.
- MusicBrainz search requests.
- Cover Art Archive requests.
- Real album creation or editing.
- Real listening-entry creation.
- Database-backed search, sorting, or filtering.
- Persistent client-side state.
- Listening queue.
- Insights dashboard.
- Offline functionality.
- Profile/settings screens.

These can be addressed in later work once the UI reveals the actual requirements.

---

# 8. Completion criteria

Milestone 4 is complete when:

- The application has a coherent visual identity.
- The Library is the default screen.
- All four views are implemented.
- Navigation between views works locally.
- Album details and listening history render from mock data.
- The Add album flow demonstrates search results, manual entry, and editing.
- The Log a listen modal is usable.
- The application is responsive.
- The implementation uses only vanilla HTML, CSS, and TypeScript.
- No external service or database calls are made.
- TypeScript compilation succeeds.

## Development principles

- Build one phase at a time.
- Inspect the actual browser output after each phase.
- Avoid premature abstractions.
- Keep rendering, state, and data separate.
- Prefer simple functions over elaborate component machinery.
- Do not introduce dependencies without a clear need.
- Do not start the next phase until the current one is reviewed.

The goal is not to build a frontend framework. The goal is to build a small, understandable application that we can comfortably extend.