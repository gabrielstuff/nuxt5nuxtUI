# Nuxt UI UPopover entry cycle repro

Minimal reproduction for a Nuxt 5 nightly + Nuxt UI 4.7.1 production client bundle issue.

The repro uses only `UApp`, `UPopover`, and `UButton`. A production build generates a client chunk that imports a helper from `#entry` and calls it as a top-level module namespace helper, matching the browser failure shape:

```text
TypeError: e is not a function
```

## Run

```bash
bun install
bun run dev
```

```bash
bun run build
npm run preview -- --port 8798
```

Expected result: the dev server starts normally, the production build completes, and preview serves the page. In the browser, the preview build fails during client runtime with `TypeError: e is not a function`.

## Debug

The build keeps client sourcemaps enabled. Keep Vite minification enabled: disabling minification changes the generated chunk shape and can hide this bug.

After `bun run build`, run:

```bash
node scripts/check-client-cycle.mjs
```

Expected result: the checker prints the generated chunk path, line, column, and nearby source for the bad `#entry` helper call.

Current output maps the generated chunk back through the sourcemap to:

```text
node_modules/.cache/@vue/runtime-dom/dist/runtime-dom.esm-bundler.js:1996:22
```

That is the same runtime location reported by the browser preview error around `initVShowForSSR`.

The Nuxt UI setup follows the documented Nuxt install path: `@nuxt/ui` in `modules`, `app/assets/css/main.css` importing `tailwindcss` and `@nuxt/ui`, and `UApp` wrapping `NuxtPage`.
