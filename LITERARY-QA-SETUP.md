# The Writer’s Desk — Literary Q&A

## Install
Extract this patch **into the root of your existing Astro website**, merging `src` and overwriting only the matching patch files. The patch intentionally does not modify `BaseLayout.astro` or the social/imprint update.

Run `npm.cmd run build` then `npm.cmd run dev` in VS Code. Preview `/writing/questions/` and the Writing page.

When the build succeeds, publish with:

```powershell
git add .pages.yml src/content.config.ts src/content/literary-qa/.gitkeep src/pages/writing/index.astro src/pages/writing/questions/index.astro LITERARY-QA-SETUP.md
git commit -m "Add searchable literary Q&A Twitch video archive"
git pull --rebase origin main
git push origin main
```

If git reports conflicts or unstaged changes, **stop and inspect** before continuing. Do not force push or delete the local game editor/backups.

## Add videos through Pages CMS
Open **The Writer's Desk — Literary Q&A**, create an entry, and supply its title, Twitch highlight URL or clip URL, viewer name, category, tags (each independently entered), optional short description, spoiler warning, and Featured flag. Turn on **Show on website**. Featured entries also appear on `/writing/`.

Search includes title, description, viewer, category, and tags. Clicking a tag starts a matching search. Categories filter results. Spoiler-tagged videos have a warning before loading the player. All video players load only when clicked, so pages stay fast.

**Twitch highlights** work when they use the normal `https://www.twitch.tv/videos/123456789` link. Some Twitch links do not support embedding or expire; such entries always provide a direct Twitch link. Twitch videos must remain publicly accessible on Twitch.

## Important
This patch was based on the latest uploaded site ZIP. It adds no sample videos or invented questions. The archive looks clean until you publish a real highlight.
