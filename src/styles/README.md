# Stylesheet organization

`main.css` is the single entry point, imported by `src/main.ts`. Vite resolves its local imports for development and bundles them for production.

Imports preserve the original stylesheet's exact rule order. Each file is a contiguous slice, including its existing media/container queries and comments. The split does not introduce cascade layers, change selectors, consolidate duplicate rules, or relocate responsive overrides.

- `base.css`: tokens, reset, native controls, and default focus behavior.
- `layout/`: header, footer, original responsive overrides (including reduced motion), and swipe previews.
- `components/`: utilities, buttons, dialogs/forms/search/rating controls, late focus overrides, and visibility/draft controls.
- `features/`: library, album detail, catalog pickers/pages/presentation, listening/credits, genres, artists, and authentication.

Some slices intentionally contain styles shared with another feature: the library slice includes album cards and ratings; catalog styles include main navigation and shared buttons. `catalog-presentation.css` remains last because its later responsive rules override earlier catalog styles. Likewise, `focus-overrides.css` follows the original genre section, and `visibility-and-drafts.css` follows authentication. Moving those rules beside earlier related declarations would change their cascade position.

Add styles to the owning file where its cascade position is appropriate. Any reordering or duplicate consolidation should be a separate change with before/after visual verification. Recheck library, detail, all three catalogs, album editor, and authentication at desktop/narrow widths and with reduced motion; run the Node/browser suites and production build.
