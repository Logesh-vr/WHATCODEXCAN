# Security and data handling

Faultline is shipped for local use. The supplied Supabase configuration uses development credentials and confirms signup immediately. Keep it on loopback; it is not a public production deployment.

- `.env.local`, runtime downloads, database volumes, local tools, logs, and browser traces are not committed. `.env.example` contains variable names and a local URL only.
- The browser receives only the public Supabase key. Service-role keys and signing secrets belong exclusively in local administration or trusted server environments.
- PostgreSQL enables and forces row-level security on decisions. Four ownership policies cover reads, inserts, updates, and deletes. Column grants prevent authenticated users from transferring ownership.
- JSON payloads are validated by Zod and PostgreSQL. Revision checks prevent stale account saves from overwriting newer versions.
- Browser-only decisions stay in localStorage. Account drafts stay in memory until saved, while Supabase's session tokens persist in browser storage. Signing out clears the account draft.
- User content is rendered through React; exported text escapes Markdown and raw HTML delimiters.

For a suspected vulnerability, use the repository's private vulnerability reporting option if available. Do not post tokens, private decisions, or working exploit credentials in a public issue. If private reporting is unavailable, open a minimal issue requesting a private contact method without disclosing sensitive details.

The [verification report](docs/VERIFICATION.md) records the checks actually run. Passing automated checks is not a guarantee of complete security. Hosted use requires separate Auth, email, transport, rate-limit, backup, and deployment configuration.
