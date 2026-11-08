# Readability and modularity implementation plan

## Objective and constraints

Make the existing application easier to understand and extend while preserving its behavior. Work in small, independently reviewable changes. Avoid framework changes, schema changes, UI redesigns, and speculative abstractions. Prefix HTML template literals with `/* HTML */`.

The initial audit found a 3,072-line controller, a 2,785-line stylesheet, and useful existing view/service boundaries. Most shared mutable state is scoped to `initializeApp`, rather than being global. Replacing the initializer with one large class would retain the underlying coupling.

## 1. Regression baseline and low-risk extractions (current slice)

- Add `npm test` for the existing Node tests and a separate browser test command.
- Commit Playwright setup with desktop and mobile/touch projects, isolated browser storage, and a local Vite server without account configuration.
- Cover album edits and listening entries surviving reload, draft recovery, dialog dismissal and focus, catalog associations, and a mocked import review/save flow.
- Extract `LibraryData` into `src/types/library.ts`; services must not import shared types from a UI controller.
- Move stateless field, link-row, and catalog-image field rendering into a component module, keeping markup and selectors unchanged.
- Extract repeated trimmed FormData reads. Leave feature-specific validation and mutations in place until their feature is extracted.
- Validate with Node tests, browser tests, TypeScript/production build, and formatting of changed files.

Acceptance: extracted helpers have explicit inputs and no controller state dependencies; current workflows pass in both browser projects. This is a first regression baseline, not complete coverage of every application branch.

### Completed first-slice handoff

- Shared library type, field/link/image markup helpers, and trimmed form-value reads are extracted. Feature-specific validation and state remain in the controller.
- `npm test`: 18 passing Node tests, including three new helper boundary checks.
- `npm run test:browser`: six scenarios in each of desktop and mobile Chromium (12 passing checks): album fields/links, listening entries, Escape/focus restoration, draft reload/discard, genre association creation/removal, and metadata failure/retry/review/save.
- Production build passes. No intended product behavior, storage format, or schema changes.
- Remaining coverage includes authenticated save rejection/retry, broader catalog operations, Tab boundaries, and detailed pointer/backdrop interactions. Sections 2–5 are intentionally deferred.

## 2. Dialog lifecycle and editor drafts (next agent)

Before moving code, extend browser coverage for dirty-form keep/discard/continue, navigation while editing, Tab boundaries, focus restoration, backdrop drags, and picker selection with touch and keyboard. Include blocked draft storage and account-scoped draft isolation.

Extract dialog ownership (open/close, focus, backdrop and keyboard interactions) and draft persistence/restoration into separate modules. Define narrow callbacks for serializing/restoring the active editor. Preserve event capture order, microtasks, request versions, and mobile compatibility-click suppression. Give listeners, timers, and observers explicit disposal; wire disposal through application teardown/HMR.

Acceptance: editor state has an identifiable owner; mounting and disposing does not duplicate listeners; existing pointer behavior and draft data format remain compatible.

## 3. Feature ownership

Extract one feature at a time: listening entries, album editor, catalog editors/pickers, then metadata import search. Each owns temporary state, rendering, validation, and its event handlers. Keep durable library data separate from form selections and search state. Pass specific operations through small typed interfaces rather than handing every module a mutable application context.

Keep routing and feature wiring in the application controller. Share route rendering with swipe previews where practical, preserving inert previews and ID removal. Do not generalize all catalog pickers unless their actual differences remain easy to express.

Acceptance: a feature can be understood without tracing a document-wide event switch and unrelated closure variables. Tests pass after each extraction.

## 4. Library state and persistence

Before extraction, add mocked authenticated browser tests covering successful save, rejected save and retry, pending controls, navigation during a request, and server timestamp reconciliation. Add focused delta tests for new/changed/deleted rows, association replacement/reordering, and unchanged data. Run the existing SQL tests against a disposable local Supabase instance when changing persistence behavior.

Introduce one owner for committed library state and save coordination. Preserve atomic RPC deltas, account scoping, rollback on rejected saves, and the distinction between failed account saves and unavailable demo storage. Prefer explicit save results over boolean/null conventions once characterization tests protect each branch. Keep domain updates separate from DOM disabling, error messages, and navigation.

Acceptance: rejected saves never become committed UI data; retry retains editable input; successful saves retain server timestamps; no full-library replacement is introduced.

## 5. Stylesheet organization

Capture representative screenshots for library/detail/catalog/editor/auth views at desktop and narrow widths. Split base tokens/reset, shell/layout, shared components, and feature styles. Preserve source order and responsive overrides during extraction. Consolidate duplicates only in a separate change with visual verification.

Acceptance: no layout, cascade, overflow, focus, or reduced-motion regressions.

## Working agreement and handoff

Run `npm test`, `npm run test:browser`, and `npm run build` for each completed slice. Install browser binaries with `npx playwright install chromium` when needed. Browser tests use a dedicated local port and mocked metadata; they do not write to a real account. Record limitations honestly: Chromium touch emulation does not replace a real iOS Safari check for pointer/keyboard changes.

Keep storage keys, serialized draft/demo formats, DOM selectors, route hashes, and service contracts stable during structural extractions. If a bug is discovered, document it and handle it separately rather than silently changing behavior during a move. The subsequent agent should start with section 2; authenticated persistence characterization remains required before section 4.
