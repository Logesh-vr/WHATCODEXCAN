# Publication commit map

These 38 commits organize the completed project for publication at the owner's request. They are a retrospective logical breakdown, not the original chronology of tool calls. Commits use their actual publication-preparation timestamps; no dates were backdated. Earlier groups are assembly steps and are not all standalone runnable releases. The complete project is at commit 38.

|   # | Commit                                                                 | Scope                                                                                                                |
| --: | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
|   1 | chore: establish repository hygiene and line endings                   | `.gitignore`, `.gitattributes`, `.editorconfig`                                                                      |
|   2 | build: pin application dependencies and Node runtime                   | `package.json`, `package-lock.json`, `.nvmrc`, `.node-version`                                                       |
|   3 | style: configure consistent source formatting                          | `.prettierrc.json`, `.prettierignore`                                                                                |
|   4 | build: enable strict TypeScript validation                             | `tsconfig.json`                                                                                                      |
|   5 | build: configure loopback Vite development and preview                 | `vite.config.ts`                                                                                                     |
|   6 | docs: define the product options and Faultline scope                   | `docs/PRODUCT.md`                                                                                                    |
|   7 | docs: preserve the autonomous build challenge and rubric               | `docs/EXPERIMENT.md`                                                                                                 |
|   8 | design: record the editable Figma design structure                     | `docs/figma-state.json`                                                                                              |
|   9 | design: add the Canva mark and asset provenance                        | `public/faultline-canva.jpg`, `docs/ASSETS.md`                                                                       |
|  10 | content: establish product voice and shared interface copy             | `src/copy.ts`, `docs/COPY.md`                                                                                        |
|  11 | feat: define validated decision documents and examples                 | `src/model.ts`                                                                                                       |
|  12 | feat: calculate rankings uncertainty and exact tipping points          | `src/engine.ts`                                                                                                      |
|  13 | test: verify decision mathematics validation and export                | `vitest.config.ts`, `tests/engine.test.ts`                                                                           |
|  14 | backend: configure the dedicated local Supabase stack                  | `supabase/config.toml`                                                                                               |
|  15 | backend: create validated owner-scoped decision storage                | `supabase/migrations/20261016074922_faultline_decisions.sql`                                                         |
|  16 | fix: use explicit array types in database validation                   | `supabase/migrations/20261016081810_explicit_validation_arrays.sql`                                                  |
|  17 | feat: persist browser and private account notebooks                    | `src/storage.ts`                                                                                                     |
|  18 | feat: add accessible native modal interactions                         | `src/Modal.tsx`                                                                                                      |
|  19 | feat: edit bounded options criteria and decision context               | `src/Editor.tsx`                                                                                                     |
|  20 | feat: provide account signup and sign-in states                        | `src/Auth.tsx`                                                                                                       |
|  21 | feat: visualize single-criterion sensitivity curves                    | `src/StressChart.tsx`                                                                                                |
|  22 | feat: compose the complete decision workspace and notebook             | `src/App.tsx`                                                                                                        |
|  23 | style: implement responsive layouts and accessible visual states       | `src/styles.css`                                                                                                     |
|  24 | feat: bootstrap the app with local fonts and error recovery            | `src/main.tsx`, `index.html`                                                                                         |
|  25 | build: install and resolve the verified local Supabase CLI             | `scripts/supabase-command.mjs`, `scripts/install-wsl-backend.ps1`, `scripts/install-wsl-backend.sh`                  |
|  26 | fix: manage backend lifecycle and WSL recovery                         | `scripts/backend.mjs`, `scripts/keep-backend-alive.sh`                                                               |
|  27 | build: generate public-only local client configuration                 | `scripts/configure-env.mjs`, `.env.example`                                                                          |
|  28 | test: exercise real Auth RLS validation and concurrency                | `scripts/test-backend.mjs`                                                                                           |
|  29 | test: configure cross-platform browser verification                    | `playwright.config.ts`                                                                                               |
|  30 | test: cover guest workflows accessibility and failure states           | `tests/e2e/workspace.spec.ts`                                                                                        |
|  31 | test: verify private account workflows and failed-save recovery        | `tests/e2e/account.spec.ts`, `scripts/test-accounts.mjs`                                                             |
|  32 | perf: add reproducible production measurements                         | `scripts/measure-performance.mjs`, `docs/measurements/frontend.json`                                                 |
|  33 | docs: capture desktop mobile and private notebook evidence             | `docs/screenshots/workspace-1440.png`, `docs/screenshots/workspace-390.png`, `docs/screenshots/account-notebook.png` |
|  34 | docs: explain implementation tradeoffs and plugin evidence             | `docs/DECISIONS.md`, `docs/PLUGIN-EVIDENCE.md`                                                                       |
|  35 | docs: document limitations security and contribution boundaries        | `docs/LIMITATIONS.md`, `SECURITY.md`, `CONTRIBUTING.md`                                                              |
|  36 | docs: deliver setup verification and the two-minute demo               | `docs/SETUP.md`, `docs/VERIFICATION.md`, `docs/DEMO.md`                                                              |
|  37 | ci: verify formatting build calculations and browser workflows         | `.github/workflows/ci.yml`                                                                                           |
|  38 | docs: present the experiment product mechanics and publication history | `README.md`, `docs/COMMIT-MAP.md`                                                                                    |
