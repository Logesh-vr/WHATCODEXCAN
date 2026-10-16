# Setup and development

**Make the tradeoff visible.**

Faultline is a decision stress lab. Give your options scores and priorities, then find the smallest weight change that could overturn the current result. Keep uncertain scores visible, explore a scenario, and export the reasoning.

![Faultline workspace](screenshots/workspace-1440.png)

## Start the app

Requirements: Node.js 22.19 or newer in the Node 22 line, npm 10+, and a modern browser. No GPU, model download, or paid API is needed. Commands below run from the project root.

```powershell
npm ci
npm run dev
```

Open **http://127.0.0.1:5173/**. Without backend configuration, you can use the complete comparison, scenario, browser notebook, and export flow. The label says **This browser only**. Browser storage is specific to the browser profile and origin; `localhost` and `127.0.0.1` have separate notebooks.

For accounts and private database storage, complete the next section. A local `.env.local` may already exist on the machine this project was built on; start the backend to use it.

## Full setup on Windows with WSL Ubuntu

This is the verified runtime path on the development machine. The setup uses a dedicated Docker network and containers named for `faultline`. It does not connect to or modify any hosted Supabase project.

1. Install Node.js 22 LTS and WSL 2 with Ubuntu. On a new machine, run `wsl --install -d Ubuntu` in an administrator terminal, restart if Windows requests it, then launch Ubuntu once to complete its setup. Ubuntu must have systemd enabled; current WSL Ubuntu installations normally do.
2. From this project in PowerShell, install app dependencies and the local backend runtime:

   ```powershell
   npm ci
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/install-wsl-backend.ps1
   ```

   The script installs Docker Engine inside Ubuntu if missing, starts it, and downloads the pinned official Supabase CLI **2.121.0** to `.runtime/`. It verifies the archive’s published SHA-256. It does not change Windows' saved execution policy. On a slow connection, rerunning the script resumes the archive download.

3. Start the backend in a terminal that stays open:

   ```powershell
   npm run backend:start
   ```

   The first run downloads the Postgres, Auth, REST API, and gateway images, then applies the checked-in migration. Wait for `Faultline backend ready`. Keeping this terminal open prevents WSL from shutting down its background services.

4. In a second PowerShell terminal, write the local public client configuration and start the frontend:

   ```powershell
   npm run setup:env
   npm run dev
   ```

   If `.env.local` already exists, the helper refuses to overwrite it. Use `npm run setup:env -- --force` only to intentionally replace it with this local stack. Restart a running Vite server after configuration changes.

5. Open **http://127.0.0.1:5173/** → **Sign in** → **Create an account**. Use an email-shaped address and a password of at least eight characters. This development stack confirms accounts immediately and sends no real email. Save a decision, sign out, sign back in, and open **My notebook**.

Stop the backend with `npm run backend:stop` in another terminal. This retains database volumes. Start it again with `npm run backend:start`. If Docker is not running after a machine restart, run `wsl -u root -e systemctl start docker` first. Do not run `supabase db reset` against a notebook containing data you want to keep.

### Other supported setup paths

With a Docker-compatible runtime and the official Supabase CLI 2.121.0 already on PATH, use the same `backend:start`, `setup:env`, and `dev` commands on Linux/macOS or Windows with Docker Desktop. `SUPABASE_CLI` can point to a native executable. These alternate operating-system paths are provided but were not exercised on separate machines.

For a new hosted Supabase project, apply all checked-in files in `supabase/migrations/` in order using the Supabase CLI migration workflow, then set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.local` from that project's public API configuration. Configure Auth site/redirect URLs and email delivery for your deployment. **Never put a secret or service-role key in a `VITE_` variable.** The shipped local stack uses development credentials and must not be exposed to the internet. No hosted deployment is included.

## What you can do

- Compare 2–4 options against 2–6 criteria.
- Move weights while preserving the proportions of the other priorities.
- Edit scores from 0–10 and mark uncertainty as ±2, clipped to the scale.
- Inspect exact single-criterion weight tipping points and apply a scenario.
- Create, save, reopen, update, copy, and delete decisions.
- Keep a private account notebook or a separate browser-only notebook.
- Record what the model misses and download a Markdown decision brief.

Account saves are explicit. An unsaved account draft stays in memory, prompts before leaving, and is cleared on sign-out. Guest drafts save in the browser. Signing in preserves the current guest decision so you can save it as a new account decision; saved browser notebooks are not automatically uploaded.

## Verification commands

```powershell
npm test                  # calculation, validation, and export tests
npm run build             # strict TypeScript check and production build
npm run test:e2e           # browser-only flows, desktop/mobile, accessibility
npm run test:backend       # real local Auth/API/RLS and concurrency checks
npm run test:accounts      # real account flow in the browser
npm run format:check       # consistent source and documentation formatting
```

The `test:backend` and `test:accounts` commands require the local stack. The account browser test also requires `.env.local` and a frontend restarted with that configuration. Test users and their data are removed afterward. Backend tests refuse a non-loopback target.

Windows browser tests use installed Microsoft Edge. On another OS run `npx playwright install chromium` first. Set `PLAYWRIGHT_CHANNEL` to override the browser channel. Browser screenshots are saved under `docs/screenshots/`; failure traces are under `test-results/`.

See [the verification report](VERIFICATION.md) for observed results and performance measurements. Automated accessibility checks are not a substitute for a full assistive-technology audit.

To repeat the frontend measurements, run `npm run build`, start `npm run preview -- --host 127.0.0.1 --port 4173 --strictPort` in another terminal, then run `npm run test:performance`. This writes five local browser samples to `docs/measurements/frontend.json`.

## Architecture and data

React + TypeScript + Vite; Supabase Auth + PostgREST + PostgreSQL. Calculations happen in the browser. Fonts and the Canva mark are served locally. There are no AI API calls, trackers, or analytics.

| File / folder                                                | Purpose                                                                            |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `src/engine.ts`                                              | Weighted scores, uncertainty bounds, exact crossover calculations, Markdown export |
| `src/model.ts`                                               | Versioned document types and Zod input validation                                  |
| `src/storage.ts`                                             | Separate browser/account notebooks and optimistic revision checks                  |
| `src/App.tsx`                                                | Workspace state and user flows                                                     |
| `src/Editor.tsx`, `Auth.tsx`, `Modal.tsx`, `StressChart.tsx` | Focused UI components                                                              |
| `supabase/migrations/`                                       | Real schema, validation, ownership policies, and update trigger                    |
| `scripts/`                                                   | Local setup, backend lifecycle, environment configuration, and integration tests   |
| `tests/`                                                     | Calculation and browser coverage                                                   |

Each decision is a bounded JSONB document owned by an Auth user. PostgreSQL validates the shape and limits. RLS checks the authenticated owner's ID for every operation. Updates require the loaded revision and increment it atomically; ownership columns cannot be updated through the authenticated role.

## Design and documentation

- [Editable Figma file](https://www.figma.com/design/65uiJ7BzskfCThgA7mqP5F)
- [Open generated image](https://www.canva.com/M/MAHYGAQTn8w?utm_source=OC-AaBlKrqBJJNF&utm_campaign=agent_connector_create_image_asset_opened)
- [Product specification](PRODUCT.md)
- [Decisions log](DECISIONS.md)
- [Plugin evidence and limitations](PLUGIN-EVIDENCE.md)
- [Copy guidance](COPY.md)
- [Two-minute demo](DEMO.md)
- [Known limitations](LIMITATIONS.md)

## Troubleshooting

- **Sign-in fails to connect:** start the backend, check `npm run backend:status`, generate `.env.local`, then restart Vite. The browser-only notebook remains available when signed out.
- **Port already in use:** stop the other process using 5173 or 54320–54322, or deliberately adjust the ports in both config and environment. Do not start two copies of the same stack.
- **Docker is not ready:** start Docker Desktop, or `wsl -u root -e systemctl start docker` for the supplied Ubuntu setup.
- **WSL command fails:** open Ubuntu once, confirm `wsl -l -v` shows WSL 2, and rerun the installer. A Windows reboot may be needed after first installing WSL.
- **A save conflicts:** keep the draft and choose Decision brief → Save a copy, or reopen the newer notebook version.
- **Storage is full or blocked:** export the current brief before closing. Browser mode depends on localStorage.
- **Account passwords:** password recovery and account deletion UI are out of scope. Use local Supabase administration for development accounts; do not use the local stack as a public service.
