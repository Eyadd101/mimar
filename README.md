# Cloud Game

Cloud Game is a bilingual educational infrastructure management game for cloud beginners. You operate a growing SaaS startup, observe how traffic affects the system, and evolve one persistent architecture through a ten-stage campaign.

The campaign introduces vertical and horizontal scaling, load balancing, managed databases, caching, queues and workers, object storage, security configuration, and backup recovery. All infrastructure and AWS references are simulated; the project does not create real cloud resources or use a backend.

## Run locally

Requirements: Node.js 20 or newer and npm.

```bash
npm install
npm run dev
```

Vite prints the local URL. Campaign progress is saved in the browser with a versioned `localStorage` schema.

## Validation

```bash
npm run build
npm run lint
npm test
```

`npm run build` runs the TypeScript project build before creating the production bundle. The automated suite covers the pure simulation rules, campaign transitions, persistence, node movement, failures, and advanced resources.

For targeted balance diagnostics, run `npm run check:balance`. Add `-- --sweep` only when broad seeded campaign verification is needed.

## Stack

- React
- TypeScript
- Vite
- `@xyflow/react`
- Node's built-in test runner with Vite's module runner

## Campaign pacing

The same infrastructure continues through all ten stages. Stage durations are expressed in game seconds and the Pause, 1x, 2x, and 4x controls share one simulation clock. Temporary traffic and incident state resets between stages while resources, positions, unlocks, and campaign progression carry forward.
