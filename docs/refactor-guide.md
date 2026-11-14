# Codebase guideline refactor

Apply AGENTS.md across handwritten source in small, reviewable PRs. Inspect every
module; change it only when a guideline improves its contracts or ownership.
Leave generated files alone. Preserve behavior, storage formats, selectors, live
state getters, draft cloning, and asynchronous lifecycle guards.

## Batches

- [x] Explicit boundaries: annotate exported functions (including arrow helpers),
      name dependency objects, and define named result contracts for larger shapes.
      Keep existing dependency access and runtime behavior intact.
- [ ] Stateful ownership: review metadata search, dialog, and editor drafts for
      class conversion, one component per PR. Keep small factories as functions.
- [ ] Domain contracts: tighten draft modes/actions and validate persisted/DOM
      strings. Reduce casts through shared contracts.
- [ ] Focused cleanup: review duplicated rendering, long fallback chains,
      dependency scope, HTML annotations, and logical spacing.
- [ ] Evaluate automated enforcement of objective rules after cleanup; keep
      architectural decisions under review rather than imposing blanket rewrites.

## Workflow

Inventory gaps with syntax-aware tooling and targeted searches. Separate
mechanical changes from structural work. Review inferred types before annotating;
include null/undefined where runtime values can be absent. Do not add layers or
convert functions solely for consistency.

For each batch, run the production TypeScript build, existing unit tests,
formatting checks for changed files, and `git diff --check`. Run relevant browser
coverage for affected flows; use the full browser suite for broad source changes.
Record validation and remaining limits in the PR. Publish each completed batch
using the repository's publish-pr skill. The earlier structural refactor history
is in [implementation/refactor-plan.md](implementation/refactor-plan.md).
