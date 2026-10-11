# Game Library: Ratings & Ember Meter

Install: extract this ZIP into the existing `erikthewriter-website` project (preserve the `src/...` structure, replacing the one matching file). Run `npm.cmd run build`, then `npm.cmd run dev`. Visit `/streaming/games/`.

Adds nine exact 0.25-point rating bands (Awful through Elite), an expandable rating guide, an Ember Meter per rated game and rating-band filters. Unrated is distinct from 0.00. Existing collab form, scripts and backend files are unchanged.

To set a personal score, use the existing Pages CMS Personal game settings entry for that Steam App ID. Do not upload a new Steam export over game notes.

When the build succeeds: `git add .`, `git commit -m "Add game rating legend and ember meter"`, `git pull --rebase origin main`, `git push origin main`.
