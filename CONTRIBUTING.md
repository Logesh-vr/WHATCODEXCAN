# Working on Faultline

Use Node 22.19.0 and npm 10 or newer. Start with `npm ci`; see [setup instructions](docs/SETUP.md) for the app and local Supabase stack.

Before proposing a change:

```sh
npm run format:check
npm test
npm run build
npm run test:e2e
```

For changes to persistence, Auth, validation, or migrations, also start the local backend and run `npm run test:backend` and `npm run test:accounts`. Those checks create and remove temporary development accounts. They refuse non-loopback targets.

Keep calculations in `src/engine.ts`, validation in `src/model.ts`, and storage behavior in `src/storage.ts`. Add forward migrations rather than rewriting migrations already applied to another person's database. Keep server validation aligned with client validation. Cover behavioral changes with meaningful tests, including failure cases where appropriate.

CI checks formatting, calculation tests, the production build, and browser-only flows in Chromium. The account test is intentionally skipped in that CI job; real local account/RLS results are recorded separately. Do not add live credentials to CI just to enable it.

Generated dependencies, production bundles, runtime downloads, traces, and local environments are ignored. Curated screenshots and measurement samples under `docs/` are checked in as evidence; refresh them deliberately when the interface or measurement method changes.

The original 38 commits form a curated publication of the completed experiment. Future contributions can use ordinary, focused commits; the count is not a permanent restriction on development.

No open-source license has been selected for this project; package metadata is marked `UNLICENSED`. Third-party dependencies retain their own licenses.
