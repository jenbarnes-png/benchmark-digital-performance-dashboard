# Benchmark: Digital Campaign Manager

A website that shows how Labour MPs are doing online: whether they are posting on
Facebook, Instagram and TikTok, whether they are running ads, and a few things
reported by hand (Facebook Group posts, amplifier groups, email list sizes, newsletters). It turns
those into a weekly score out of 17 and ranks MPs against each other.

It is part of Project Beacon and sits behind the Beacon sign-in.

## Who this is for

- **MPs and their teams** use the website (Rankings, their own page, the data-entry forms).
- **Campaign staff** use Admin to approve reports and record newsletters.
- **Whoever looks after it** uses this README to run, check and fix it.

## Where the data comes from

| What | Source | How often |
|---|---|---|
| Facebook, Instagram, TikTok posts and engagement | The **Crete** store (Elasticsearch), run by Sapio | Collected by Sapio about daily; we copy it every 4 hours |
| Paid ads | Meta's public **Ad Library** (needs a token that expires about every 60 days) | Every 4 hours |
| Facebook Group posts, amplifier groups, email list sizes, newsletters | Typed in by hand on the Admin pages | When people log them |

There is no live feed. Posts reach the dashboard a few hours after they are published,
and like/comment counts are a snapshot from when Crete last collected the post.

## Setup (first time, on your own computer)

1. Install Node.js 22 or newer.
2. In Terminal, in this folder: `npm install`
3. Copy the settings template: `cp .env.example .env.local`
4. Open `.env.local` (a hidden file; press Cmd+Shift+. in Finder to see it) and fill in the
   REQUIRED values. Each one says where to get it. **Never share or commit this file.**
5. Start the website: `npm run dev`, then open http://localhost:3000

## Everyday commands

| To do this | Type this |
|---|---|
| Run the site locally | `npm run dev` |
| Pull the latest posts from Crete (**try first**: reads, writes nothing) | `npm run sync:crete:dry` |
| Pull the latest posts from Crete (for real) | `npm run sync:crete` |
| Pull the latest ads from Meta (try first) | `npm run sync:meta:dry` |
| Pull the latest ads from Meta (for real) | `npm run sync:meta` |
| Check Crete is still collecting and every MP is covered this week | `npm run check:crete` |
| Check the subscriber-growth rule | `npm run test:growth` |
| Check the amplifier-group points rule | `npm run test:amplifiers` |
| See the "reports waiting for approval" email without sending it | `npm run notify:pending:dry` |
| Send that reminder email for real | `npm run notify:pending` |
| Check the reminder email wording | `npm run test:digest` |
| Check the code compiles | `npm run typecheck` |

**What to expect from a sync:** a few timestamped lines such as
`INFO crete-sync facebook: 223 posts from 24 accounts, 24 matched to an MP.`, ending in
`Success.` If it fails you get `ERROR ... FAILED.` followed by what went wrong and how to fix it.
Every write is a safe upsert, so running a sync twice never duplicates anything.

## The automatic sync

A GitHub Actions job (`.github/workflows/sync-data.yml`) runs both syncs every 4 hours.
To see it: GitHub, the repository, the **Actions** tab. Open a run to read its log.
You can also start one by hand with **Run workflow**.

## Approval emails

Reports typed in by hand wait for an approver. Two emails help:

- **Instant**: when someone submits a report, the approvers get an email with a review link.
- **Daily reminder** (8am UTC, `.github/workflows/remind-approvals.yml`): a single email listing everything still
  waiting, and **nothing is sent when nothing is waiting**.

Both need an email account to send from. One-time setup:
1. Use a fouroneone.co.uk Google account with 2-Step Verification on.
2. Google Account, Security, 2-Step Verification, **App passwords**: create one for "Mail". Copy the 16 characters.
3. Put `GMAIL_SMTP_USER`, `GMAIL_SMTP_APP_PASSWORD` and `APPROVAL_EMAILS` in `.env.local`, and add the same three in
   Vercel (environment variables) and GitHub (Settings, Secrets, Actions). Never paste the app password into chat.
4. Test: `npm run notify:pending:dry` shows what would be sent; `npm run notify:pending` sends it.

Until step 3 is done no emails are sent (the daily job says so in its log and does nothing). Approvals still work from the Admin pages.

## Settings you can change without editing code

All are set in `.env.local` (your computer) or in Vercel's environment variables (the live site).
`.env.example` lists every one with an explanation. The useful ones:

- `TRACKING_START`: the first Monday shown on Rankings. Earlier weeks are hidden.
- `CRETE_MAX_POSTS`: safety limit on posts read per platform per run (default 50,000).
- `META_MAX_PAGES`: safety limit on Meta pages fetched per search (default 60).
- `APPROVAL_EMAILS`: who is emailed when a manual report needs approving.
- `BEACON_AUTH`: set to `on` online to require the Project Beacon sign-in.

## Who can see what

- Any signed-in Beacon account can view the dashboard.
- **Admin / Data Entry** is for Beacon *staff* and *admin* accounts.
- *Client* accounts (MP teams) can only open three forms: Facebook Group posts, amplifier groups and subscriber counts.
- Hide an MP from every public view (without deleting anything): Admin, Constituencies, Edit, tick "Hide from the dashboard".

## Reported by hand

- **Facebook Group posts** and **subscriber counts**: logged on the Admin pages, then approved by an approver.
  For subscribers, log the total list size whenever it changes. The first count is the starting point and the
  point is earned once the list is 20 or more above it.
- **Amplifier groups**: the MP's team reports weekly (members, posts that week, and a screenshot of the group). An
  approver checks the screenshot. 2 points for an established group of 3 or more members (kept until a report shows
  it has dropped below 3) plus 1 point each week it is active. Screenshots are private: only staff can see them.
- **Newsletters**: Admin, "Newsletters sent". A stop-gap until automatic detection is rebuilt.

## Troubleshooting

| Problem | Likely cause | Fix |
|---|---|---|
| `Missing setting: ...` | A value isn't in `.env.local` | Follow the "How to fix" line in the message; see `.env.example` |
| Ads sync fails with a Meta error | The Meta token expired (about every 60 days) | Make a new one in Meta's Graph API Explorer, update `META_ACCESS_TOKEN` in `.env.local`, Vercel and GitHub secrets |
| `Crete ... failed: HTTP 403` | The Crete key lacks read access, or was rotated | Ask Sapio for a read key on the `crete-*` indices and update `ES_API_KEY` |
| An MP shows no Facebook/Instagram/TikTok | Crete hasn't collected their account yet, or the account isn't matched | Run `npm run check:crete`; look for `could not match` lines in a sync |
| "Stopped: read more than ... posts" | The safety limit was hit | If that volume is expected, raise `CRETE_MAX_POSTS` |
| Site shows old data | The last sync failed, or Crete hasn't collected | Check the Actions tab, then `npm run check:crete` |
| Can't open Admin | Your Beacon account type is "client" | Ask a Beacon admin to change it to staff |

## Logs

- Scripts print timestamped lines to the terminal.
- Scheduled runs: GitHub, the **Actions** tab, open a run.
- The live website's own logs: Vercel dashboard, the project, **Logs**.
- Logs never contain keys, passwords or tokens. If you ever see one in a log, treat it as leaked and replace it.

## Changing the database

Setup files are in `supabase/migrations/`, numbered in order. **Do not run
`node scripts/migrate.mjs` on the live database**: it replays every file from the start and will fail
part-way. To apply a single new file, run just that file's SQL. Always back up first.

## Getting help

Open an issue on the GitHub repository, or ask whoever maintains it. Include the exact `ERROR` line from the log.

## Stack

Next.js (App Router, TypeScript, Tailwind), Supabase (Postgres), the Crete Elasticsearch store,
the Meta Ad Library API, Vercel (hosting) and GitHub Actions (scheduled syncs).
