# Design and asset provenance

- **Figma:** [editable design file](https://www.figma.com/design/65uiJ7BzskfCThgA7mqP5F), created before application implementation. The node IDs are recorded in `figma-state.json`.
- **Canva:** [Open generated image](https://www.canva.com/M/MAHYGAQTn8w?utm_source=OC-AaBlKrqBJJNF&utm_campaign=agent_connector_create_image_asset_opened). The connector-supplied mark is stored as `public/faultline-canva.jpg` and used for the navigation logo and favicon. It is a 200px raster asset, not a vector master.
- **Fonts:** DM Sans and IBM Plex Mono are bundled through the pinned Fontsource packages. Their package license files remain in the installed dependencies.
- **Icons:** Lucide React supplies the interface icons through a pinned dependency.
- **Screenshots:** `screenshots/` contains captures of the actual running app. The notebook screenshot uses a disposable test account, not a real person's private notebook.

The app serves its fonts and logo locally and makes no runtime calls to a design service or font CDN. Dependency and asset rights remain separate from the repository's own licensing status.
