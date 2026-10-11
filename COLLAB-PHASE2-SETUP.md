# Collaboration Requests — Phase 2 setup

This release adds the actual form and Cloudflare Pages Function for `/api/collab-request`. Your existing GitHub schedule/Discord workflows are not modified. It requires **three** separate Cloudflare settings and a one-time D1 schema setup. Until those are finished, submissions will NOT work (by design).

## 1. Set up D1 table (once)

In Cloudflare Dashboard → Storage & Databases → D1 → `erik-collab-requests` → Console, execute the statements in `sql/collab-requests.sql`. Copy all SQL statements, paste them into the console, and execute. This creates the `collab_requests` table and two indexes. Your existing `COLLAB_DB` Pages binding should be on **Production**, and it must bind `erik-collab-requests`.

## 2. Cloudflare Turnstile (anti-spam)

Go to Dashboard → Turnstile → Add widget. Create a Managed widget for **erikthewriter-website.pages.dev** plus **erikthewriter.com** and **www.erikthewriter.com** (if you will use them). Cloudflare will provide a PUBLIC **Site Key** and SECRET **Secret Key**.

In Pages project → Settings → Variables and Secrets, production environment:
- `PUBLIC_TURNSTILE_SITE_KEY` = the public site key. **Plain text** (this is intentionally public).
- `TURNSTILE_SECRET_KEY` = the secret key. **Secret**.
- `DISCORD_COLLAB_WEBHOOK` = your Discord private-channel webhook. **Secret**, already configured.

DO NOT put either secret in the public repository. The public site key is safe to include in production builds.

Also check that your `COLLAB_DB` D1 binding is present on the **Production** environment.

## 3. Copy the patch

Merge the patch ZIP into the ROOT of your Astro project (not into `src`). It contains:
- `src/pages/streaming/games/index.astro` — replaces Phase 1 catalog page, adds modal and submission behavior.
- `functions/api/collab-request.js` — new Cloudflare Pages Function.
- The `src/data/steam-games.json` file from **Phase 1 must remain** in your website. It is not duplicated in this patch. The function validates game IDs against it.
- `sql/collab-requests.sql` — database setup.

No GitHub Actions files or existing schedule webhooks are touched.

## 4. Test and deploy

From VS Code PowerShell in your project folder:

    npm.cmd run build
    npm.cmd run dev

The catalog and form will display locally. The actual `/api/collab-request` endpoint is a **Cloudflare Pages Function** and won't run under plain `astro dev`. To test submissions, commit and push after the build passes:

    git add src/pages/streaming/games/index.astro functions/api/collab-request.js sql/collab-requests.sql
    git commit -m "Add secure collaboration requests"
    git pull --rebase origin main
    git push origin main

Wait for Cloudflare Pages to finish deploying. Open the LIVE `/streaming/games/` site, select a game, and submit one **test** request. Confirm (1) success message, (2) new row in D1, (3) notification in the private Discord channel. You can query D1 from Console:

    SELECT id, game_name, contact_platform, contact_handle, request_type, preferred_date, status, created_at, notified_at FROM collab_requests ORDER BY created_at DESC LIMIT 20;

If a row exists with `notified_at` null, the request was saved but Discord notification failed. Check Pages Function logs and webhook secret. Requests do **not** disappear just because Discord is unavailable.

## Status management (initial version)

Your D1 database is the authoritative request inbox. To change a status in the D1 Console:

    UPDATE collab_requests SET status='Accepted' WHERE id='PASTE-REQUEST-ID-HERE';

Other supported values are `Pending`, `Declined`, and `Scheduled`. A private point-and-click request management dashboard (with authentication) can be the next upgrade. **No admin endpoint has been exposed publicly in this release.**

## Safeguards

All games are requestable, even single-player titles and 0/10 rated ones. Requests have optional messages (max 1,500 characters). A valid Turnstile challenge is mandatory. The server validates every field and game ID, uses parameterized D1 queries, rate-limits duplicate contact handles to 2 per 15 minutes, and prevents Discord @mentions. Failed database writes report a submission error rather than pretending to succeed. If Discord fails after storage succeeds, the submission still succeeds and the database entry persists.

**Important:** The server intentionally rejects Turnstile hostname values other than the three production domains listed in the code. If you later change domains, update the allowed-hostname list.
