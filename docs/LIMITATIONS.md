# Known limitations

- Performance was measured on the available Ryzen 7 7435HS / 24 GiB Windows host, not a separate i5-12450HX machine. The app has no GPU or model requirement, but exact timings on the requested hardware are unverified.

- Faultline is a reasoning aid, not a prediction system. Scores and weights are judgments. Weighted sums allow one strong criterion to offset another weak one. Exclude options that fail non-negotiable requirements first.
- Weight sensitivity varies one criterion at a time. It does not search combinations of changing weights or model criterion interactions.
- Uncertainty uses a fixed ±2-point interval, clipped to 0–10. Bounds assume all uncertain scores can reach their limits together. They are not probabilities or statistical confidence intervals.
- A decision is limited to four options, six criteria, a 100-character question, 500-character context, and 3,000-character note. The notebook API currently returns the newest 1,000 entries.
- Browser-only notebooks depend on localStorage and do not synchronize. A revision check catches ordinary stale saves, but localStorage cannot make simultaneous cross-tab writes transactional. Account saves use database-backed optimistic concurrency.
- Unsaved account drafts are kept in memory and cleared on sign-out. Export or save before closing. There is no offline queue or background cloud sync.
- The local Supabase stack is development infrastructure with default development credentials, immediate email confirmation, and no real email delivery. The provided Docker network binds published ports to loopback. It is not a production hosting package.
- Password recovery, account deletion UI, collaborative editing, attachments, and public sharing are outside the shipped scope.
- Writing Style skill guidance was applied, but its retrieval tools were unavailable. No retrieved personal writing-style match is claimed.
- The Canva asset supplied by the connector is a 200px raster mark. It is suitable for the small UI logo, not a vector master for large-format branding.
- The complete setup was exercised on this Windows/WSL machine; other OS instructions were not tested on separate machines. First-run container downloads require internet and can be slow.
- Automated accessibility and responsive-browser checks cover the tested surfaces. They do not establish complete screen-reader compatibility or behavior on every mobile device.
