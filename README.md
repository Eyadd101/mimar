# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

### Expanded campaign pacing

The same infrastructure continues through ten stages. Stage durations in game seconds:
270, 300, 330, 390, 330, 360, 390, 360, 330, 420.
Stages 5–6 announce a second traffic lift at 90 seconds. Stage 7 announces a
25-second worker outage at 240 seconds, Stage 8 a 20-second application outage
at 240 seconds, and Stage 10 a data-loss exercise at 180 seconds followed by a
15-second database outage at 300 seconds. All use the central simulation clock.

Run `npm run check:balance` for visible end-of-stage metrics for two strategies:
Medium Database, or Cache with a resized Small Database. Add `-- --sweep` to run
both strategies across 100 seeds. These timely-action scripts verify solvability;
they do not replace beginner usability testing. The cache strategy pays upfront
for deployment/resizing and saves 5 credits per operating period afterward.
