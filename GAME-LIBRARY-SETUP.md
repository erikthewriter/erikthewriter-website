# Game Library Phase 1

This is the user's original Astro project with a new `/streaming/games/` page, 315 imported Steam game records, and a Pages CMS collection for optional personal per-game settings. It does not submit collaboration requests yet; buttons are intentionally disabled until a secure Cloudflare backend is configured.

## Install

1. Back up your existing project, or work on a separate branch.
2. Copy the included files into the existing project, preserving relative folders and replacing matching files (only streaming/index, BaseLayout, content.config.ts, and .pages.yml among pre-existing authored files are changed).
3. Run `npm.cmd run build` in PowerShell; run `npm.cmd run dev` to preview.
4. Open `/streaming/games/`. Do not push until previewing.

## Editing game preferences

Visit Pages CMS after pushing `.pages.yml`. Create a **Personal game settings** entry named after the game's App ID (example `739630`, which corresponds to Phasmophobia). Enter the same App ID in the required field. Choose rating and status; save. The catalog will rebuild with the overlay. Only create records for games you wish to annotate. Game import data is separate; never overwrite your notes when refreshing the Steam JSON. A rating of 0 is a valid rating, distinct from leaving it blank.

Genre and mode filters initially show available tags only. They expand as you fill in genres/modes in CMS. No modes or genres are invented by the import, since the JSON has none. Steam artwork uses Steam's game header images and can be unavailable for some apps.

## Next phase

Set up a private Cloudflare Pages Function + D1 and a separate secret Discord webhook, Turnstile/rate limits; enable on/off-stream form with optional preferred date and message only after submissions are securely stored and tested. Avoid putting secrets in public repo.
