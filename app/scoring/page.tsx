import { RECENT_WINDOW_DAYS, AD_RECENCY_POINTS } from "@/lib/adRecency";

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

      <Section title="Overall score">
        <p>
          Each constituency gets an overall score out of 100 for each week, calculated as the
          average of whichever metrics below have data that week. A metric with no data isn&apos;t
          counted as zero — it&apos;s left out of the average entirely, so an incomplete-data seat
          doesn&apos;t look like an inactive one.
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
          A constituency we haven&apos;t matched to an advertiser Page yet is excluded from this
          metric entirely (shown as no data), not scored as zero.
        </p>
      </Section>

      <Section title="Organic posting, Facebook group activity, newsletter sends">
        <p>
          Each scored relative to the best-performing pilot constituency that week: the highest
          raw count that week scores 100, everyone else is scaled proportionally against it. This
          is also a placeholder — it compares seats only to each other, not to a fixed benchmark or
          target, so it will get fairer as the pilot grows and better benchmarks emerge.
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
