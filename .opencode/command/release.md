---
description: Analyze changes since the last release, choose the correct SemVer bump, and publish a verified Tauri GitHub Release.
agent: build
---

Run the complete Tempo release flow. `$ARGUMENTS` may be `auto`, `patch`, `minor`, or `major`; when omitted, use `auto`.

## Safety Rules

- Read the current branch and stop if it is `main` or `master`.
- Inspect `git status` before changing anything. Do not discard, reset, stash, or overwrite existing user changes.
- Do not publish a release if the working tree contains unrelated changes. Explain the blocker instead.
- Never reuse an existing tag or release.
- Ask for confirmation exactly once before the first version-changing or publishing action. In `auto`, include the recommended bump and its reasoning in that confirmation.

## Phase 1: Audit

Inspect:

1. Current branch, working tree, latest tags, and latest GitHub Release.
2. The commit range from the latest release tag to `HEAD`.
3. `git diff <latest-tag>..HEAD --stat` and the relevant full diff.
4. `src-tauri/tauri.conf.json`, `package.json`, `package-lock.json`, and `.github/workflows/release.yml`.
5. Existing tests, build commands, and release workflow behavior.

If no previous tag exists, use the current application version as the baseline and state that limitation.

## Phase 2: Impact And Version

Classify the highest-impact user-facing change since the previous release:

- `patch`: backward-compatible bug fixes, internal refactors, documentation, or maintenance only.
- `minor`: backward-compatible functionality, UI capability, or a new optional feature.
- `major`: breaking behavior, removed functionality, incompatible configuration/state, or a public contract change.

Use the highest applicable level when changes are mixed. Do not infer the bump only from commit prefixes; verify the actual diff.

Calculate the next version from the current version in `src-tauri/tauri.conf.json`:

- patch: `X.Y.Z` -> `X.Y.(Z+1)`
- minor: `X.Y.Z` -> `X.(Y+1).0`
- major: `X.Y.Z` -> `(X+1).0.0`

Before asking for confirmation, report:

- baseline tag/version;
- commits and user-visible changes included;
- recommended impact and why;
- proposed version and tag;
- files that will change;
- validation and publish commands that will run.

If `$ARGUMENTS` explicitly requests a bump that differs from the analysis, explain the mismatch and include both choices in the single confirmation prompt; do not ask a second confirmation question.

## Phase 3: Prepare

After confirmation:

1. Verify the proposed tag does not exist locally or remotely.
2. Update the version in `src-tauri/tauri.conf.json`.
3. Keep `package.json` and `package-lock.json` versions synchronized when they contain the application version.
4. Review the resulting diff and ensure only release-related files changed.
5. Run the project validation commands, at minimum `npm run build` and `git diff --check`. Run focused tests when available.
6. Stop and report failures; do not tag or push a failed release.

## Phase 4: Publish

When validation passes:

1. Create one conventional commit:
   `chore(release): prepare vX.Y.Z`
2. Push the current branch with `git push origin HEAD`.
3. Create and push the tag:
   `git tag vX.Y.Z`
   `git push origin vX.Y.Z`
4. Monitor the `Release` workflow with `gh run list` and `gh run watch`.
5. Verify the GitHub Release exists, is not a draft or prerelease, and contains the Windows MSI and NSIS installer assets.
6. Report the commit, tag, workflow URL, release URL, assets, and any non-blocking warnings.

Do not amend commits, force-push, or push any branch other than the current branch.
