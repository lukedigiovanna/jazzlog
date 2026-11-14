---
name: publish-pr
description: Publish a completed, well-defined JazzLog change as a GitHub pull request using gh api. Apply after implementing a feature, fix, or refactor in this repository.
---

Complete each well-defined change with a pull request unless the user explicitly requests otherwise. This repository convention authorizes creating a branch, committing the task's changes, pushing it, and opening the PR; it does not authorize merging or deployment.

1. Inspect the working tree, branch, remotes, and recent commits. Preserve unrelated user changes and include only the current task. Create a descriptive feature branch from the intended base; avoid carrying commits from an unrelated or unmerged PR.
2. Finish the implementation and run the TypeScript production build, relevant existing tests (including browser coverage for changed flows), formatting checks for changed files, and git diff --check. Resolve failures caused by the change. Disclose any remaining validation limits.
3. Review the final diff, stage explicit paths, and commit with a concise description of the outcome. Push the branch with upstream tracking. Use normal pushes; do not force-push without authorization.
4. Use gh api to inspect the repository's default branch and check for an existing open PR for this head branch before creating another. If a mutation times out or gives an ambiguous response, query GitHub state before retrying.
5. Prepare a JSON request file outside the repository containing title, head, base, and body. Preserve actual newlines with a JSON serializer. Create the PR with gh api --method POST repos/{owner}/{repo}/pulls --input <file>. For an existing task PR, update its title/body using PATCH.
6. Lead the PR description with the concrete problem and resulting behavior. Include only implementation details needed for review, validation actually performed, and material limitations. Verify the returned PR URL, base, and head.
7. Report the PR link and a concise validation summary. Stop before merging.

Use the permission mechanism when filesystem or network access requires escalation; repository policy does not bypass sandbox permissions.
