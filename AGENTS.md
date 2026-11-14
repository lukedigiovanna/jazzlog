# Repository instructions

- Prefix every HTML template literal with `/* HTML */` immediately before the opening backtick so Prettier formats the embedded HTML.

# Code Best Practices

- Use classes for substantial components that own mutable state and a lifecycle. Keep stateless helpers and small factories as functions; avoid large factory functions containing an entire component's implementation.
- Give dependency objects named interfaces or type aliases. Group related dependencies by responsibility (for example, dialog, drafts, persistence, and pickers), and expose only the capabilities the consumer needs.
- Define shared contracts explicitly instead of coupling consumers to another factory through `ReturnType<typeof createSomething>`.
- Declare return types on exported functions and class methods. Prefer inference for short local callbacks. Constructors already declare their instance type and need no return annotation.
- Mark class implementation details `private` and stable dependencies `readonly`. Keep the public API small. Invoke methods through their instance, or wrap them in callbacks when passing them elsewhere, so `this` remains bound.
- Prefer named helpers with switches, early returns, or typed lookup tables for multi-way domain decisions and long fallback chains. Keep simple two-way ternaries and short nullish defaults inline when they remain easy to read; preserve fallback order and live state access when extracting logic.
- Use string unions for closed sets of modes and actions. Validate strings from persisted data or the DOM before treating them as those types.
- Separate rendering, validation, and storage from orchestration when they form a focused responsibility. Extract duplicated behavior into shared helpers; avoid adding layers for trivial operations.
- Preserve live access to shared state when refactoring dependencies. Do not replace getters with snapshots when the underlying arrays or objects can be reassigned.
- For draftable components, expose paired snapshot/restore methods for related selections and choices. Clone at those boundaries so drafts cannot mutate live picker state; keep live getters for consumers that need current selections.
- Preserve lifecycle guards for asynchronous work so stale results cannot update a replaced or disposed view.
- Apply these practices to new and modified code incrementally. Verify refactors with the TypeScript build and relevant existing tests, including browser coverage for changed user flows.

- Use a single blank line between logical units within functions and methods, such as setup, validation, state changes, and persistence. Apply the same grouping within longer callbacks and switch cases; avoid inserting gaps mechanically between every statement.

# Pull request workflow

- Complete every well-defined feature, fix, or refactor with a pull request unless the user explicitly asks otherwise. Follow the repository skill at [.agents/skills/publish-pr/SKILL.md](.agents/skills/publish-pr/SKILL.md), using gh api to create or update the PR. This authorizes committing and publishing the task's changes, but not merging or deploying them.
