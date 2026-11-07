# UI port verification

Verified locally on 2026-11-06 using Vite and headless Chromium (Playwright). Browser tooling was temporary; no application dependencies were added.

`npm run build` passes TypeScript compilation and Vite production bundling.

## Desktop and mobile workflows

The following checks passed at 1440px and 390px viewport widths:

- Initial library: ten albums, eleven listens, and loaded local SVG covers.
- Library search, combined genre filtering, clear filters, all four sort choices, and list view.
- Keyboard activation of a library album opens its details; back and JazzLog home links return to the library.
- Listening history and external music links render on the detail page.
- Dialog initial focus, forward/reverse Tab wrapping, Escape dismissal, and return to the opener.
- Arrow-key half-star rating selection; saving a listen updates history and the latest rating.
- Album edits and new listening entries survive reload.
- Catalog search, result review, save, and selection of an already-added result.
- Manual entry, adding a music link, and safe external link attributes.
- No uncaught browser errors during these workflows.

The port's library grid columns, cover width, featured-album width, and heading size were compared directly with the reference at 1440, 1100, 850, 630, 420, 390, 360, and 320px. All matched. Library and detail pages fit without horizontal overflow; dialogs fit and forward focus wrapping passed at every width. Desktop library, mobile library, mobile detail, and mobile edit-dialog screenshots were also inspected.

Malformed and blocked localStorage both fall back to the fixture library. Unknown album routes show the unavailable-album view.

## Rechecking manually

1. Run `npm run dev`, then open the printed local URL.
2. Repeat the workflows above at desktop and mobile widths, using Tab, Shift+Tab, Enter, Escape, and the rating radio group's arrow keys.
3. Reload after editing or logging a listen. Clear the `jazzlog-demo-v1` localStorage key to reset the demo.
4. Run `npm run build` before reviewing or publishing changes.

Real MusicBrainz, Cover Art Archive, and Supabase integration remains separate work. External music links open their destinations only when selected. The fixture catalog does not contact metadata services.

## Instrument catalog mockup

Verified on 2026-11-07 in desktop and touch-emulated Chromium:

- Catalog navigation, search, category filters, and the unused-only filter.
- Creating an unused instrument with multiple categories and retaining it after reload.
- Case-insensitive duplicate-name validation and shared name/category edits across album appearances.
- Selecting an unused catalog instrument on an album and following its usage link back to that album.
- Creating an instrument with categories from the album picker.
- Removing the last album association keeps the instrument in the catalog; used instruments cannot be deleted.
- Canceling deletion preserves the instrument; confirming deletion removes it after reload.
- Older album-array snapshots, including legacy per-listen instrument strings, migrate to the catalog with their album associations intact.
- Touch dialogs and quick-add actions avoid automatic input focus. Catalog details and edit dialogs fit at 375px and 320px without horizontal overflow.
- No uncaught browser errors during these workflows. Mobile detail screenshot inspected.

Catalog and album data share the `jazzlog-demo-v1` snapshot; no database writes or schema changes are involved.
