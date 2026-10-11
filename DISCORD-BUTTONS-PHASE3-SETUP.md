# Phase 3: Manage collaboration requests using Discord buttons

This patch changes ONLY the request submission Function and adds the signed Discord interactions endpoint. It does not modify your Game Library page, Pages CMS, schedule integration, or existing Discord schedule webhooks.

## 1. Update the existing D1 database

Cloudflare Dashboard > D1 > `erik-collab-requests` > Console. Run `sql/collab-phase3-migration.sql` **once**. Existing requests are preserved. If an ALTER TABLE statement reports a duplicate column, do not blindly run the entire script again; check the existing columns first.

## 2. Set up the Discord application as a bot (no always-on process)

In the Discord Developer Portal, open **Erik Collab Manager** > Bot. Create/reset the bot token if needed and copy it to Cloudflare **without pasting it into GitHub or chat**. In your Pages project > Settings > Variables and Secrets (Production):

- `DISCORD_COLLAB_BOT_TOKEN`: **Secret**, Discord bot token.
- `COLLAB_DISCORD_CHANNEL_ID`: **Text**, numeric channel ID of the private `collab-requests` channel (Discord Developer Mode > right-click channel > Copy Channel ID).
- `DISCORD_APPLICATION_PUBLIC_KEY`: **Text**, already configured.
- `COLLAB_ADMIN_DISCORD_ID`: **Text**, already configured.
- Existing `DISCORD_COLLAB_WEBHOOK`, `COLLAB_DB` and Turnstile settings remain unchanged.

Invite the application into **The Haunted Library** via the Developer Portal Installation / OAuth2 invite settings with `bot` scope, **View Channel**, **Send Messages**, and **Read Message History** permissions only (no Administrator permission). Grant it access specifically to your private `collab-requests` channel using that channel's role/member permission settings. The application must own the new notification messages for its buttons to work. It doesn't need to stay running on a PC.

## 3. Add patch files and deploy

Merge the ZIP into your website project root. Run `npm.cmd run build`, then commit and push:

    git add functions/api/collab-request.js functions/api/discord-interactions.js sql/collab-phase3-migration.sql DISCORD-BUTTONS-PHASE3-SETUP.md
    git commit -m "Manage collab requests using Discord buttons"
    git pull --rebase origin main
    git push origin main

Wait for the Cloudflare production deployment to finish. Cloudflare Pages Functions serve `/api/discord-interactions` automatically.

## 4. Tell Discord where to send button clicks

In Discord Developer Portal > Erik Collab Manager > General Information, set **Interactions Endpoint URL** to:

    https://erikthewriter-website.pages.dev/api/discord-interactions

Save. Discord sends a signed PING to validate the endpoint. If validation fails, verify the production deployment succeeded and `DISCORD_APPLICATION_PUBLIC_KEY` exactly matches this application, with no spaces. The endpoint cannot pass verification before deploying this patch.

## 5. Test with a NEW request

Visit your LIVE Game Library and submit a new test request. The **new** notification should come from the Discord app/bot and have **Accept**, **Decline**, **Schedule**, and **Reopen** buttons. Previous webhook messages will not acquire buttons automatically. Click **Accept** as your approved Discord account. It should update the message to `Accepted` and update the D1 row.

Confirm in D1 Console:

    SELECT game_name, status, discord_message_id, handled_at FROM collab_requests ORDER BY created_at DESC LIMIT 5;

Have someone else click a button: they should receive an **ephemeral** unauthorized response with no database change. If bot messaging fails, the existing private webhook is used for notification (without buttons) and the request remains saved.

## Security and behavior

Discord signs all interaction requests; the endpoint validates the Ed25519 signature and timestamp before doing anything. It checks the clicking Discord User ID server-side and verifies the message ID and channel ID match the stored request and configured channel. The bot token is a Cloudflare secret; it is NEVER included in public JS. D1 is the source of truth. The buttons do NOT contact the applicant or create a scheduled stream automatically; only the request status changes. Existing requests remain Pending unless you change them manually in D1; past webhook notifications cannot be retroactively made interactive.

**Important:** The interaction webhook response needs to be sent to Discord quickly. Cloudflare Pages Functions are appropriate; if Discord shows 'interaction failed', check Cloudflare Functions logs for slow database queries or an application public-key mismatch.
