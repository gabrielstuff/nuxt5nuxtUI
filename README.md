# Nuxt UI UPopover entry cycle repro

Minimal reproduction for a Nuxt 5 nightly + Nuxt UI 4.7.1 production client bundle issue.

The repro uses only `UApp`, `UPopover`, and `UButton`. A production build generates a client chunk that imports a helper from `#entry` and calls it as a top-level module namespace helper, matching the browser failure shape:

```text
TypeError: e is not a function
```

## Run

```bash
bun install --ignore-scripts
bun run repro
```

Expected result: `bun run repro` builds successfully, then `scripts/check-client-cycle.mjs` fails with the detected bad client chunk cycle.
