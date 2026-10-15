# AfconCity Quest — website

Real Fumba, Zanzibar in 3D, playable in any browser. This repository holds the game's source and the ready-to-serve website.

## What's where

| Folder | What it is |
|---|---|
| `dist/` | **The website.** Serve this folder as-is: a small `index.html`, the game and textures in `assets/`, and the offline helper `sw.js`. |
| `v3/` | Game source: `js/` modules, `page.html` (markup and styles), `build.py` |
| `web/` | Icons, share image, manifest, `_headers` and `robots.txt`, copied into `dist/` on every build |
| `osm2/`, `tex/` | Map and texture data baked into the game at build time |
| `tools/` | Automated test suites (Playwright) |

## Deploy on Cloudflare Pages (free)

1. Push this repository to GitHub.
2. In Cloudflare: **Workers & Pages → Create → Pages → Connect to Git**, then pick this repository.
3. Build settings:
   - Framework preset: **None**
   - Build command: *(leave empty)*
   - Build output directory: **`dist`**
4. Click **Save and Deploy**. The game is live at `<project>.pages.dev` within a minute or two.
5. **Custom domains → Set up a custom domain**, enter your domain and follow the DNS step. HTTPS is automatic.

Every push to `main` goes live automatically. Every other branch gets its own preview link, for testing before release. To roll back, open **Deployments** and choose an older one.

## Updating the game

```
AFC_SITE_URL=https://afconcity.com python3 v3/build.py web   # rebuilds dist/ from the source
```

Commit `dist/` together with the source changes, then push.

Optional build settings:

- `AFC_SITE_URL=https://your-domain.com python3 v3/build.py web` writes absolute share-image links, so WhatsApp, X and Facebook link previews show `og.jpg`.
- `SITE_CONTACT` in `v3/js/55-ads.js` is the booking contact brands see on the Advertise page: an email, a WhatsApp number with country code, or an https link.

## Online features (Supabase)

On afconcity.com, multiplayer, ad bookings, owner sign-in, chat moderation, feedback and stats run on Supabase. The project URL and publishable key are in `v3/js/49-web.js`. Inside Claude, the game still uses Claude's own runtime, so both copies work.

- `supabase/setup.sql` creates the tables and the rules for who can read and write what. Paste it into the Supabase SQL Editor and click Run. Running it again is safe.
- In Supabase, under **Authentication → Sign In / Providers**, turn on **Allow anonymous sign-ins**. Players are signed in silently, with no form.
- Owner sign-in: the owner emails in the `admins` table get a sign-in code (or link) by email. Add another owner with `insert into admins values ('name@example.com');`
- Chat: the server stars out words in `chat_words`, allows one message per 1.5 seconds and 12 a minute, blocks banned players, and stops all chat when the owner switches it off. Add a filtered word with `insert into chat_words values ('word');`
- `supabase/test_policies.sh` tests the rules against a local Postgres; `tools/web_mp.py` tests two players against an in-browser stand-in for Supabase.

## Fast loading

The website build (`python3 v3/build.py web`) writes:

- `dist/index.html`: a small page, always checked for updates.
- `dist/assets/game.<fingerprint>.js` and `dist/assets/tex/*.<fingerprint>.webp`: cached by browsers for a year (see `web/_headers`). A new build changes the fingerprints, so players get updates straight away.
- `dist/sw.js`: an offline helper, so repeat visits start from the phone's own copy and the game opens without a connection.

The loader in `v3/web_loader.js` shows real download progress in the Play button. Phones on Fast graphics get half-size ground textures and skip the fine surface-detail maps. `tools/swtest.py` checks caching and offline play, and `tools/loadtime.py` times each loading step.

## Wardrobe and welcome questions

- The island wardrobe (`v3/js/19b-style.js`) holds the tops, bottoms, shoes, hats, sunglasses, colours, fabric prints and curated looks. Add a look to `PRESETS`, or an item to `TOPS`/`BOTTOMS` with the prints it can come in. Women's choices always cover the thigh.
- Prints are drawn once into a small texture atlas in the same file; `PAT_M` sets how big a print repeat is on the cloth.
- A look travels to other players as a short code (`lookCode`/`lookFrom`), so older copies of the game still see a jersey.
- The welcome questions (`v3/js/48-onboard.js`) add TSh 15,000 per answer to a new player's starting cash, plus TSh 30,000 for answering all eight. Answers stay on the player's device and go anonymously into their play stats. The owner sees the totals under Advertise → Tester insights.
- `tools/onboard.py` tests both.
