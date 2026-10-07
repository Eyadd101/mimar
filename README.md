# Mimar — مِعمار

Build. Scale. Stay reliable.

ابنِ. وسّع. حافظ على الخدمة.

Mimar is a bilingual educational cloud infrastructure simulation game. Players build, connect, scale, and troubleshoot a growing SaaS architecture through a persistent ten-stage campaign.

The campaign introduces vertical and horizontal scaling, load balancing, managed databases, caching, queues and workers, object storage, security configuration, and backup recovery. All infrastructure and AWS references are simulated; the project does not create real cloud resources or use a backend.

## Core gameplay

- Build and connect infrastructure on a draggable React Flow canvas.
- Diagnose CPU, memory, latency, database, queue, storage, security, and recovery problems.
- Balance service reliability against deployment and operating costs.
- Carry resource choices, upgrades, graph positions, and campaign progress between stages.
- React to forecast traffic and scheduled incidents using Pause, 1x, 2x, and 4x game speeds.
- Learn generic cloud concepts first, with AWS service names shown as secondary references.

The formulas are intentionally simplified and deterministic enough to teach cause and effect. They are educational models, not production capacity-planning guidance.

## Campaign and localization

The ten connected stages begin with an empty Stage 1 canvas and gradually unlock the existing resource systems. Stage progress, infrastructure, and the current simulation checkpoint are stored locally in the browser. Invalid or incompatible saves are rejected safely so the player can begin a clean campaign.

English and Arabic share one localization system. Arabic explanatory text uses RTL layout while English cloud terminology remains visible as an LTR learning aid.

## Run locally

Requirements: Node.js 20.19+ within the 20.x line, or 22.12+ and npm (the installed Vite major version does not support Node 21).

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

## Project structure

- `src/components`: presentation and game controls
- `src/data`: stages, resource presentation, and educational content
- `src/simulation`: pure simulation, campaign, topology, and persistence rules
- `src/i18n`: English and Arabic dictionaries and language state
- `tests`: behavior-focused simulation and campaign tests
- `scripts`: optional balance diagnostics

## Campaign pacing

The same infrastructure continues through all ten stages. Stage durations are expressed in game seconds and the Pause, 1x, 2x, and 4x controls share one simulation clock. Temporary traffic and incident state resets between stages while resources, positions, unlocks, and campaign progression carry forward.

## Production build

`npm run build` writes the static site to `dist`. The application uses no client-side URL routes, backend, credentials, or external runtime services, so the generated files can be served by a normal static host at the site root. Run `npm run preview` to inspect that build locally.

The production game fetches only its own static files. It does not call an API, load remote fonts or images, or send analytics/telemetry. Clicking an external attribution link, if shown by React Flow, is a separate user-initiated navigation.

## Security boundary and deployment

This is a client-side educational simulation. It has no accounts, server-side authorization, real AWS operations, production infrastructure access, or cloud credentials. Campaign saves live in the player's browser `localStorage`; a player can edit or delete their own save, so it is not a security or anti-cheat boundary. The loader validates save shape, size, numbers, progression, and topology to prevent malformed local data from destabilizing the game. No secrets belong in Vite client environment variables: values exposed through `import.meta.env` are included in the public bundle.

Configure response headers on the eventual static host, not in an HTML meta tag. Recommended production headers are `Content-Security-Policy` (start in report-only mode and verify React Flow's inline styles; a candidate policy is `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and a restrictive `Permissions-Policy` for unused device APIs. `frame-ancestors` needs an HTTP response header to prevent embedding. Serve over HTTPS; configure HSTS at the host after confirming HTTPS for the whole origin. These headers are deployment responsibilities and are not asserted by the local build.

## Project status

The complete ten-stage campaign is a release candidate for owner playtesting. The current milestone focuses on a single-player browser experience and local persistence; it has no accounts, multiplayer, backend, or real cloud integration.
