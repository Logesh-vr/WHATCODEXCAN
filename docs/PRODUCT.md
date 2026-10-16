# Faultline

Move an assumption. See what changes.

## The choice

Three directions were considered before implementation:

| Direction     | Audience                             | Distinction                                                        |
| ------------- | ------------------------------------ | ------------------------------------------------------------------ |
| Faultline     | Students, solo builders, small teams | Find the precise assumption that can overturn a weighted decision. |
| Echo Atlas    | Musicians and curious makers         | Build an instrument from the pitch and decay of an everyday tap.   |
| Scene Receipt | Designers and creative coders        | Replay parameter changes behind a visual experiment.               |

Faultline was selected for a complete, useful loop without inference costs or specialized hardware. Weighted decision analysis is established; the product's contribution is combining exact weight tipping points, explicit score uncertainty, and a portable reasoning brief in a small, inspectable workspace. This is not a claim of research novelty or market exclusivity.

## Scope

- Create a question with context, 2–4 options, and 2–6 positively framed criteria.
- Allocate weights, edit 0–10 scores, and mark uncertain scores.
- Compute weighted rankings and conservative uncertainty intervals.
- Find the nearest single-criterion weight crossover analytically.
- Explore a scenario without changing the decision, then apply it explicitly.
- Save, reopen, update, copy, and delete decisions.
- Use a private Supabase account or an explicitly labeled browser-only notebook.
- Record reasoning and download a complete Markdown brief.
- Support keyboard operation, responsive layouts, reduced motion, and failure states.

Out of scope: collaboration, public sharing, AI advice, payments, probabilistic forecasts, password recovery UI, multi-criterion optimization, and account administration. Non-negotiable requirements must be used to exclude options before scoring.

## Architecture

React + TypeScript + Vite, with self-hosted fonts and an SVG chart. Calculations are pure TypeScript. Zod validates documents at the browser boundary. Supabase Auth provides email/password sessions; PostgREST provides notebook CRUD; PostgreSQL validates payloads and enforces ownership with RLS. A version check prevents silent overwrites of an account decision saved concurrently elsewhere. Browser notebooks use localStorage and are separate from account notebooks.

The application makes no AI requests. The graphics do not require a discrete GPU.

## Data model

`faultline_decisions`: UUID ID, owner UUID referencing `auth.users`, JSONB payload, revision, creation time, update time. An owner/update-time index supports notebook listing.

The versioned JSON payload contains title, context, criteria (UUID/name/weight), options (UUID/name/score map), and reasoning notes. Scores contain a number and an uncertainty flag. A bounded document makes the entire decision atomic; relational child tables would add coordination without a useful query requirement at this scale.

## Risks and boundaries

Subjective inputs remain subjective. Weighted sums allow compensation between criteria. Correlated uncertainties are not modeled. An interval is a bound, not a confidence interval or a probability. Weight sensitivity changes one criterion while keeping other proportions fixed. Browser-only data can be cleared by the browser. Account drafts are in memory until saved. The local Supabase stack is development infrastructure and must not be exposed publicly.
