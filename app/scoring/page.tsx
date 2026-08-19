import { RECENT_WINDOW_DAYS, AD_RECENCY_POINTS } from "@/lib/adRecency";
import { TIKTOK_MAX_POINTS } from "@/lib/tiktokScoring";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-black/10 p-5 dark:border-white/15">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="mt-2 space-y-2 text-sm text-black/70 dark:text-white/70">{children}</div>
    </div>
  );
}

export default function ScoringPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">How scoring works</h1>
        <p className="mt-2 text-black/70 dark:text-white/70">
          This page explains the current ranking model in plain terms. It&apos;s a living
          document — we&apos;ll keep it updated here whenever the scoring rules change, so
          this is always the source of truth for how the numbers on Rankings and Constituency
          Detail are actually calculated.
        </p>
      </div>

      <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-5 dark:border-indigo-900 dark:bg-indigo-950/40">
        <h2 className="text-lg font-semibold tracking-tight text-indigo-900 dark:text-indigo-200">
          The Dream Week
        </h2>
        <div className="mt-2 space-y-2 text-sm text-indigo-900/80 dark:text-indigo-200/80">
          <p>
            The Dream Week is the gold standard for local digital campaigning. The goal is to
            reach it week in and week out to grow your digital presence in the places that
            matter to your constituents. We&apos;ll support your office to achieve it with
            on-demand resources, training sessions and more.
          </p>
          <p>
            Check this dashboard to see how you&apos;re progressing, how close you are to
            reaching the Dream Week, and how you rank compared to other offices.
          </p>
        </div>
      </div>

      <Section title="Overall score">
        <p>
          Each constituency gets an overall score out of 100 for each week: real points earned,
          divided by the total points possible so far —{" "}
          <strong>
            {AD_RECENCY_POINTS.active} for paid advertising + {TIKTOK_MAX_POINTS} for TikTok ={" "}
            {AD_RECENCY_POINTS.active + TIKTOK_MAX_POINTS} points total
          </strong>
          . Organic posting, group activity and newsletter sends are shown on their own cards but
          don&apos;t count toward this score yet — they&apos;re scored relative to other
          constituencies rather than on a fixed points scale, so they&apos;ll join the total once
          they have one. A constituency missing a point-scored metric (no advertiser resolved, no
          TikTok account matched) earns 0 of that metric&apos;s points rather than being excluded —
          same as zero activity would score, so a seat doing well on just one metric doesn&apos;t
          look like a strong all-rounder. The one exception: a seat with no data on either
          point-scored metric shows as &quot;No data&quot; rather than a misleadingly exact 0,
          since we can&apos;t yet tell &quot;confirmed inactive&quot; from &quot;not tracked
          yet&quot;.
        </p>
      </Section>

      <Section title="Paid advertising (Meta)">
        <p>
          Scored on activity, not just spend — since real spend targets haven&apos;t been set yet,
          rewarding recent ad activity is a fairer proxy for now than comparing pounds spent.
          Matches the colours on the National Dashboard hex map exactly:
        </p>
        <ul className="ml-4 list-disc space-y-1">
          <li>
            <span className="font-medium text-emerald-600 dark:text-emerald-400">🟢 Running an ad right now</span>{" "}
            — {AD_RECENCY_POINTS.active} points
          </li>
          <li>
            <span className="font-medium text-amber-600 dark:text-amber-400">
              🟠 No ad running now, but had one within the last {RECENT_WINDOW_DAYS} days
            </span>{" "}
            — {AD_RECENCY_POINTS.recent} point
          </li>
          <li>
            <span className="font-medium text-red-600 dark:text-red-400">
              🔴 No activity in over {RECENT_WINDOW_DAYS} days, or never
            </span>{" "}
            — {AD_RECENCY_POINTS.stale} points
          </li>
        </ul>
        <p>
          A constituency we haven&apos;t matched to an advertiser Page yet shows &quot;no
          data&quot; for this metric specifically — but it still counts as 0 toward the overall
          score above, the same as a matched constituency with no recent ad activity.
        </p>
      </Section>

      <Section title="Organic posting (Facebook, Instagram, YouTube), Facebook group activity, newsletter sends">
        <p>
          Each scored relative to the best-performing pilot constituency that week: the highest
          raw count that week scores 100, everyone else is scaled proportionally against it. This
          is also a placeholder — it compares seats only to each other, not to a fixed benchmark or
          target, so it will get fairer as the pilot grows and better benchmarks emerge.
        </p>
      </Section>

      <Section title="TikTok">
        <p className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
          Live for the 28 pilot MPs — counted in the overall score
        </p>
        <p>
          TikTok has no compliant automated public-data source we can pull ourselves (confirmed
          against TikTok&apos;s own current API documentation and the third-party data-provider
          market as of August 2026). Video and follower data shown here instead comes from an
          internal Brandwatch-backed TikTok data warehouse, maintained by Hani and refreshed every
          few hours, matched against our 28 pilot MPs by name. You can see it on the National
          Dashboard and each constituency&apos;s page. A constituency whose MP we haven&apos;t
          matched to a TikTok account yet shows &quot;no data&quot; for this metric
          specifically — but, like paid advertising, it still counts as 0 toward the overall score
          above. Scored out of {TIKTOK_MAX_POINTS} points:
        </p>
        <ul className="ml-4 list-disc space-y-1">
          <li>Posted within the last 48 hours — 1 point</li>
          <li>Posted within the last 7 days — 1 point</li>
          <li>Posted within the last 14 days — 1 point</li>
          <li>Posted within the last 30 days — 1 point</li>
          <li>
            Had the single best-performing post nationally that week (by views, ties broken by
            likes) — 1 point
          </li>
        </ul>
        <p>
          The first four stack rather than replace each other — post yesterday and you get all
          four, not just one. The fifth is a genuine competition: only one constituency holds it
          per week, and it moves to whoever posted the best-performing video that week, not
          whoever held it last.
        </p>
      </Section>

      <Section title="Rank">
        <p>
          National and regional rank are just the overall score sorted highest to lowest. Tied
          scores share the same rank (e.g. two seats both in 3rd place, next seat is 5th, not
          4th).
        </p>
      </Section>

      <Section title="Change vs. previous period">
        <p>This week&apos;s overall score minus last week&apos;s. Shown as unavailable if either week has no score to compare.</p>
      </Section>
    </div>
  );
}
