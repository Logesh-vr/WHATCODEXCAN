# Verification report

Run date: 16 October 2026. This report separates observed checks from product limitations. Commands run from the project root on Windows, with Microsoft Edge for browser tests and WSL Ubuntu for the local backend.

Observed host: AMD Ryzen 7 7435HS, 16 logical CPUs, 24 GiB RAM; Node 22.19.0 and npm 10.9.3. The requested Intel i5-12450HX machine was not available for a separate physical benchmark. The app needs no GPU or local inference model; resource measurements below describe this host only.

## Frontend checks

| Check                    | Observed result                                                                                                                                                                                                                                                                                                                                    |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`               | 9 tests passed, including exact crossover calculations, endpoint behavior, normalization, uncertainty bounds, malformed inputs, and escaped export text. One test validates every reported crossover across 100 deterministic generated decisions.                                                                                                 |
| `npm run build`          | Strict TypeScript and Vite production build passed.                                                                                                                                                                                                                                                                                                |
| Clean installation       | Copied the app source, public assets, package manifest, lockfile, and build configuration into a separate directory with no dependencies. `npm ci --prefer-offline --no-audit --no-fund` installed 128 packages; the production build passed. This is an isolated clean dependency check on the same machine, not a separate Windows installation. |
| Browser notebook         | Create/edit, score changes, scenarios, apply weights, notes, save, reload, reopen, Markdown download, and delete passed in Edge.                                                                                                                                                                                                                   |
| Recovery and limits      | Corrupt browser storage produces recoverable errors; option/criterion bounds and tied/uncertain decisions passed.                                                                                                                                                                                                                                  |
| Tipping-point regression | Explore tipping point opens the exact 34.375% crossover, displays the tie, and leaves the original 7.75 score unchanged.                                                                                                                                                                                                                           |
| Accessibility            | Axe WCAG 2 A/AA and 2.1 AA rules report zero violations on the default desktop/mobile workspace and the mobile editor, maximum-sized comparison, stress test, brief, and empty notebook. Keyboard dialog dismissal and tab navigation passed.                                                                                                      |
| Responsive layout        | No document-level horizontal overflow at 1440×1000 and 390×844. The score matrix intentionally scrolls inside its panel on narrow screens. Desktop and mobile screenshots were visually inspected.                                                                                                                                                 |
| Runtime dependency audit | `npm audit --omit=dev --json`: zero reported vulnerabilities at test time. This is not a general security audit.                                                                                                                                                                                                                                   |

The final combined browser run with `RUN_BACKEND_TESTS=1` passed all **8 tests** in 27.2 seconds, with no skipped tests. The normal browser suite deliberately skips the account test unless that flag is set. `npm run test:accounts` sets it and runs the account test against the real local stack. Signup and populated private-notebook screens also passed the automated accessibility checks.

## Backend checks

The dedicated local Supabase stack is running PostgreSQL, Auth, PostgREST, and Kong. Both migrations were applied: `20261016074922` creates the schema and policies; `20261016081810` makes validation-array types explicit. No hosted project was changed.

- **16 real integration checks passed** after the final migration: two-account authentication; owner insert/read/update/delete; denial of another account's reads, updates, and deletes; forged-ownership and owner-reassignment rejection; anonymous access rejection; malformed-document and out-of-range-score rejection; matching-revision updates; stale-write prevention; revision-trigger enforcement; sign-out.
- **The real browser account flow passed:** signup, private save, failed-save recovery, update, sign-out, invalid-password error, successful sign-in, session restoration after reload, reopening saved notes, copying, and deletion. Private decision text was not written to the guest draft store. Temporary test accounts were removed afterward.
- **Database lint passed with no schema errors or warnings:** `supabase db lint --local --schema public,faultline_private --level warning --fail-on warning`.
- **Supabase security advisors reported no issues:** `supabase db advisors --local --type security --level warn --fail-on warn`. This is a scoped automated check, not a penetration test.
- Direct database inspection confirmed both RLS and FORCE RLS enabled, with separate SELECT, INSERT, UPDATE, and DELETE policies for the authenticated owner.
- Actual Docker port bindings were `127.0.0.1:54321` for the API gateway and `127.0.0.1:54322` for PostgreSQL. Auth and REST had no host-published ports. The CLI prints a generic all-interface warning, but this project's dedicated Docker network overrides the default binding; the actual bindings were inspected.
- The documented backend installer was rerun successfully: the official archive checksum passed and the installed CLI version was 2.121.0.
- A final scan found no local service-role, secret API, or JWT signing credentials in `.env.local` or the compiled JavaScript. All local README artifact links resolved, and the frontend returned HTTP 200 after recovery.

## Performance method

`scripts/measure-performance.mjs` measures five fresh browser contexts against the production preview on loopback, at 1440×1000, with no network or CPU throttling. It records navigation timings, largest contentful paint, transferred resources, and JavaScript heap. Slider samples include Playwright's input round-trip plus two animation frames, so they are not pure React render timings.

Raw results for the final account-enabled production bundle are in `measurements/frontend.json`.

| Measurement                    | Observed result                                                                                                                                                                                           |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Largest contentful paint       | Median 168 ms; range 136–1,020 ms across five fresh contexts. The slowest sample is retained, not discarded.                                                                                              |
| DOM content loaded             | Median 64.2 ms; range 58.5–943.7 ms.                                                                                                                                                                      |
| Frontend resources transferred | 223,118 bytes per measured initial load.                                                                                                                                                                  |
| JavaScript heap                | Approximately 4.7 MB; excludes browser-process and GPU memory.                                                                                                                                            |
| Slider input plus two frames   | Approximately 32–37 ms across 35 samples, including the browser-driver round-trip.                                                                                                                        |
| Production JavaScript          | 474.91 kB uncompressed; 138.60 kB gzip, with Supabase account support enabled.                                                                                                                            |
| Production CSS                 | 23.52 kB uncompressed; 5.68 kB gzip.                                                                                                                                                                      |
| Four backend containers        | About 235 MiB combined at the recorded snapshot: database 80.93, Auth 12.64, REST 32.41, gateway 109 MiB. CPU readings ranged from 0 to 6.1%; this was a point-in-time sample, not a sustained load test. |
| WSL memory                     | `free -m` reported 919 MiB used and no swap use; includes more than this application's containers.                                                                                                        |
| Docker disk footprint          | Approximately 3.5 GiB across `/var/lib/containerd` and `/var/lib/docker` after setup, including images and database storage. First-run downloads were slow and required a registry retry.                 |

These are local development measurements on the observed host. They do not establish a production load capacity or exact timings on the requested Intel machine.

## Fixes made during verification

- Repaired clipping in the editable Figma frames before implementation.
- Improved muted text and accent contrast after accessibility checks.
- Added an accessible name to the compact mobile notebook button.
- Accepted timestamp offsets returned by PostgreSQL in the saved-document validator.
- Fixed the criterion-change effect that reset an exact crossover to the baseline weight.
- Escaped raw HTML delimiters as well as Markdown syntax in exported user text.
- Made the backend installer reuse an already verified archive and include both executables required by the current CLI distribution.
- Replaced two implicit text-to-array casts with explicit array initializers in a forward migration; the final schema lint passed without warnings.
- Fixed startup after a WSL interruption: the helper now holds the distribution open before health checks and waits for an existing database to recover. The real backend and browser account tests were repeated after recovery.

## Boundaries

The full list is in `LIMITATIONS.md`. No hosted deployment, separate-machine installation, full screen-reader audit, probabilistic forecast validation, or personal writing-style retrieval is claimed. The local Auth configuration confirms development accounts immediately; production email delivery and account recovery are not configured.
