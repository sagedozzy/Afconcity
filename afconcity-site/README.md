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

- The island wardrobe (`v3/js/19b-style.js`) holds the tops, bottoms, shoes, hats, sunglasses, colours, fabric prints and curated looks. Add a look to `PRESETS`, or an item to `TOPS`/`BOTTOMS` with the prints it can come in. Women's hems stop no higher than the knee. The wardrobe covers the island as it is: Swahili kanzu, kofia and headscarves, Maasai shuka with beaded collars, kikoi wraps, kitenge, ankara and dashiki, duku head wraps, office blazers, safari and campus wear, and beach and resort clothes.
- Prints are drawn once into a small texture atlas in the same file; `PAT_M` sets how big a print repeat is on the cloth.
- A look travels to other players as a short code (`lookCode`/`lookFrom`), so older copies of the game still see a jersey.
- The welcome questions (`v3/js/48-onboard.js`) add TSh 15,000 per answer to a new player's starting cash, plus TSh 30,000 for answering all eight. Answers stay on the player's device and go anonymously into their play stats. The owner sees the totals under Advertise → Tester insights.
- `tools/onboard.py` tests both.

## Daily play, leaderboards, match days and Kiswahili

- `v3/js/62-daily.js`: a daily login reward that grows with a streak (TSh 5,000 up to TSh 50,000 on day 7) and three daily challenges, each paying TSh 8,000–15,000, plus TSh 15,000 for all three.
- `v3/js/61-online.js`: analytics events, cloud save codes, the weekly Passport Race and other leaderboards, and invites. A friend who starts playing through your link earns you both TSh 25,000, for up to 10 friends a week.
- `v3/js/63-events.js`: match days. AFCON 2027 dates are built in, and the owner adds more under Advertise. During a match day, cheering in the Fan Zone pays TSh 2,000 a minute, for up to 30 minutes.
- `v3/js/64-owner.js`: the owner's brand bookings (approve or decline) and player analytics.
- `v3/js/05-i18n.js`: the Kiswahili switch, under Settings. It covers menus, panels, questions, wardrobe, challenges and leaderboards. Most character dialogue is still in English. Add a translation to `SW`, or add a pattern to `SW_RE` for text that contains numbers.
- Players under 18 can chat only with the quick phrases in `chat_phrases`, and the server checks this.
- Brands book at `/brands` (`web/brands.html`, `web/brands.js`) and pay through Bachs. The Edge Function `supabase/functions/bachs` sets the price from the owner's rates, opens the Bachs checkout and marks a booking paid when Bachs's signed webhook arrives. The owner then approves it in the game.
- `tools/online.py` tests all of the above against the in-browser Supabase stand-in.

## Story missions, the economy and Nyota

- `v3/js/65-mission.js`: the story after the VIP ticket. Buying the ticket opens **The Summit** at the Zanzibar Tech & AI Summit hall; passing it opens **Pitch Day** (vibe-coding at the Kahawa Code café, a timed ride to the Burj, then three investor questions and an offer). Cutscenes play on their own small sets with subtitles in the player's language. Voice files, when added, go in `web/voices/<en|sw>/<line id>.mp3`; without them the subtitles carry the scene. `tools/story.py` tests it.
- `v3/js/66-economy.js`: businesses that earn while the game is closed (up to a cap), vehicles you own (fuel, repairs, weekly insurance, towing), and the startup's daily salary. On afconcity.com the clock comes from the server, so earnings cannot be fast-forwarded. `tools/economy.py` tests it.
- `v3/js/67-nyota.js`: **Nyota**, stars bought with Bachs on afconcity.com and spent on cosmetic items and conveniences (vehicle paint, a golden name tag, fireworks, a 7-day business pass). The balance is kept on the server (`wallets`), credited only by the payment function when Bachs confirms payment, and spent only through `nyota_buy`. Game shillings can never be bought. Players who said they are under 18 see no shop, and the server refuses their top-ups. Packs and items, with their prices, are rows in `nyota_packs` and `nyota_items`: edit them in the Supabase Table Editor. To refund, refund the payment in Bachs, then run `select nyota_refund('<top-up id>')` as the owner. `tools/nyota.py` tests the client; `supabase/test_policies.sh` tests the database rules.

## Owner setup (one time)

1. **Database.** Paste `supabase/setup.sql` into the Supabase SQL Editor and click Run. Then, under **Database → Extensions**, turn on **pg_cron** and run the file again: this schedules the nightly clean-up (chat after 30 days, events after 90, saves and scores after 12 months idle).
2. **Payments (Bachs).**
   - In Supabase, under **Edge Functions → Deploy a new function → Via editor**, name it `bachs`, paste in `supabase/functions/bachs/index.ts` and deploy. Then open its settings and turn **Verify JWT** off, because Bachs cannot send a Supabase token.
   - Under **Edge Functions → Secrets**, add `BACHS_SECRET_KEY` and `BACHS_WEBHOOK_SECRET` from your Bachs dashboard. To test first, also add `BACHS_API` = `https://sandbox-api.bachs.io` with your sandbox keys, and delete it when you go live. If Bachs cannot charge in TZS, set `BACHS_CURRENCY` (for example `USD`) and `BACHS_FX`, the number of shillings per unit of that currency (for example `2600`).
   - In Bachs, add the webhook `https://duwxnxvrrzqiaeortusg.supabase.co/functions/v1/bachs/webhook` for `collection.succeeded`, `collection.failed` and `collection.underpaid`.
   - In the game, sign in as the owner and set **Prices per month** under Advertise. Opening that panel also publishes the list of slots that `/brands` shows.
3. **Sign-in emails (Resend).** In Resend, add and verify the domain `afconcity.com` (Resend shows the DNS records to add in Cloudflare), then create an API key with **Sending access**. In Supabase, under **Authentication → Emails → SMTP Settings**, turn on custom SMTP and enter:
   - Host `smtp.resend.com`, port `465`, username `resend`.
   - Password: the Resend API key. Paste it only here.
   - Sender `no-reply@afconcity.com`, name `AfconCity`.
   
   Then raise the email rate limit under **Authentication → Rate Limits**.
4. **After an update that changes `setup.sql` or the payment function**, run `setup.sql` again (it is safe to re-run) and redeploy the `bachs` function with the new `index.ts` (keep **Verify JWT** off).
