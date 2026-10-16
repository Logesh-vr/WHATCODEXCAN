# The experiment

The owner supplied an open-ended build challenge, required tools, a process, hardware constraints, and an evaluation rubric. No product idea, application code, wireframes, or implementation plan was supplied. Codex chose the product and carried out the design, implementation, and verification.

This records an OpenAI Codex run. It can serve as one example when comparing coding agents, including Claude, but no Claude build, controlled benchmark, or comparative score is included. Subsequent user messages asked what was being done when a usage limit was reached, requested continuation, and requested publication to `Logesh-vr/WHATCODEXCAN` in 38 logical commits.

## Original build challenge

The text below preserves the challenge with transport escaping and whitespace normalized for Markdown readability.

> You are an autonomous senior product engineer and designer. Your task: invent and build a complete, working project of YOUR choice. The idea can be anything (web app, tool, game, dev utility, creative product, literally anything), but it must be genuinely original, not a to-do app, weather app, or generic dashboard.
>
> PLUGINS: Supabase (backend/auth/db), Figma (design), Canva (visual assets/branding), and the Writing Style plugin (all user-facing copy).
>
> CONSTRAINTS
>
> - It must run locally on: Intel Core i5-12450HX, RTX 3050 6GB, 16–32GB RAM, 512GB SSD.
> - Ship something finished and usable end-to-end, not a prototype skeleton.
> - Work autonomously. Do not ask me clarifying questions; state your assumptions and proceed.
>
> PROCESS (follow in order)
>
> 1. IDEATE: Propose 3 distinct ideas with a one-line pitch, target user, and why it's novel. Pick one and justify the choice.
> 2. PLAN: Short spec: core features, scope (what's in/out), architecture, data model, and risks.
> 3. DESIGN: Create the UI in Figma first (design system, key screens, states). Use Canva for logo/branding assets. Use the Writing Style plugin for all microcopy, onboarding, and empty/error states.
> 4. BUILD: Implement using Supabase (schema, auth, row-level security). Handle loading, empty, and error states. Make it responsive and accessible.
> 5. VERIFY: Run it, test the main flows, fix bugs you find, and report honestly what works and what doesn't.
> 6. DELIVER: README with setup steps (must work on a fresh machine), a decisions log (key tradeoffs), known limitations, and a 2-minute demo script.

## Evaluation rubric from the brief

| Criterion                          | What to check                                                                                                   | Weight |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------- | -----: |
| Innovation and uniqueness          | Is the idea fresh, or a common tutorial project?                                                                |    15% |
| UI/UX                              | Visual polish, consistency, flow, responsiveness, empty/error states                                            |    15% |
| Functionality and completeness     | Do all promised features work end-to-end?                                                                       |    15% |
| Code quality                       | Structure, readability, no dead code, sensible architecture                                                     |    10% |
| Plugin usage                       | Did it really use Figma (actual file), Supabase (real schema, RLS), Canva, and Writing Style, or just claim to? |    10% |
| Autonomy and instruction following | Did it follow your process and constraints without hand-holding?                                                |    10% |
| Reliability                        | Bugs, crashes, edge cases, and whether its own tests pass                                                       |     5% |
| Security                           | RLS policies, no exposed keys, input validation, auth correctness                                               |     5% |
| Performance on your hardware       | Load time, RAM/CPU use, lag                                                                                     |     5% |
| Documentation                      | Does the README work on a clean setup? Is the decisions log honest?                                             |     5% |
| Copy quality                       | Does the writing feel human and on-brand, or generic AI filler?                                                 |     5% |

The percentages are reproduced as supplied. No evaluation score was assigned by the implementation agent.

## What the run demonstrates, and what it does not

- Codex selected Faultline from three ideas, designed it, implemented it, tested real database behavior, and supplied the delivery documents. [Product specification](PRODUCT.md).
- The work used established frameworks and mathematical methods. “From scratch” describes this application's creation, not the invention of React, Supabase, weighted scoring, or every dependency.
- Actual Figma and Canva artifacts are linked. Writing Style guidance was available, but its retrieval capability was not. [Plugin evidence](PLUGIN-EVIDENCE.md).
- Usage limits interrupted the run. The owner explicitly resumed it. Download retries and fixes are recorded in the decisions and verification documents.
- Tests and measurements describe this implementation and the available host. They do not establish general coding-agent superiority, research novelty, or performance on an untested machine. [Verification](VERIFICATION.md).
- The 38 commits were prepared for publication after the build. Their messages describe logical units of the delivered project; they do not reconstruct the original timestamps or claim uninterrupted execution. [Commit map](COMMIT-MAP.md).
