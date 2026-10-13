# AfconCity Quest — website

Real Fumba, Zanzibar in 3D, playable in any browser. This repository holds the game's source and the ready-to-serve website.

## What's where

| Folder | What it is |
|---|---|
| `dist/` | **The website.** Serve this folder as-is. `index.html` is the whole game (about 2.4 MB). |
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

## Single player now, online later

On the public website the game runs in single-player mode, and saves are kept in each player's browser.

Multiplayer, the shared ad-booking database and in-game feedback use Claude's runtime, so they only work in the Claude-hosted copy for now. On this website they show as "coming soon" until a backend (for example Supabase) is connected.
