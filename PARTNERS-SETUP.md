# Friends of The Library — Partners feature

## Install
Extract the ZIP into the root of your existing `erikthewriter-website` folder, merging folders and replacing matching files.

Files added or updated:
- `.pages.yml` — Pages CMS collection for sponsors and businesses
- `src/content.config.ts` — Astro collection schema
- `src/content/partners/.gitkeep` — empty collection folder
- `src/layouts/BaseLayout.astro` — navigation link
- `src/pages/index.astro` — conditional homepage spotlights
- `src/pages/partners/index.astro` — all active partners

## Test and publish
Run `npm.cmd run build`, then `npm.cmd run dev` and inspect `/` and `/partners/`.
If everything works, stage only the files listed above plus this README, commit, pull with rebase, and push to GitHub.

## Manage through Pages CMS
Once GitHub updates, refresh Pages CMS. Open **Sponsors & Featured Businesses** and create a partner record. Set **Show on website** true to display on `/partners/`. Set **Feature on homepage** true to include it among the five featured partners. Set **Display order** to prioritize cards (lower numbers first).

Listings have **no expiration dates**. You manually switch off **Show on website** to hide an entry without deleting it, or delete the entry entirely in Pages CMS.

Partners with a paid, affiliate, or gifted relationship should select the relevant disclosure. The description can give further context; disclosures do not replace any legally required clear advertising notices.

No partner entries are pre-populated and the homepage section disappears when none are active and featured.
