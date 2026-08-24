import { AD_RECENCY_POINTS } from "@/lib/adRecency";
import { TIKTOK_MAX_POINTS } from "@/lib/tiktokScoring";
import { CHANNEL_MAX_POINTS } from "@/lib/channelScoring";
import { NEWSLETTER_MAX_POINTS } from "@/lib/newsletterScoring";
import { GROUP_MAX_POINTS } from "@/lib/groupScoring";
import { SUBSCRIBER_MAX_POINTS, SUBSCRIBER_GROWTH_TARGET } from "@/lib/subscriberScoring";

const TOTAL_POINTS =
  AD_RECENCY_POINTS.active + TIKTOK_MAX_POINTS + CHANNEL_MAX_POINTS + NEWSLETTER_MAX_POINTS + GROUP_MAX_POINTS + SUBSCRIBER_MAX_POINTS;

function SourceTag({ kind }: { kind: "automatic" | "manual" }) {
  return kind === "automatic" ? (
    <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
      Automatic
    </span>
  ) : (
    <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
      Manual, needs approval
    </span>
  );
}

const ROWS: { metric: string; points: number; source: "automatic" | "manual"; detail: React.ReactNode }[] = [
  {
    metric: "Paid advertising (Meta)",
    points: AD_RECENCY_POINTS.active,
    source: "automatic",
    detail: "🟢 An ad running right now = 2. 🔴 None running = 0. Matches the hex map.",
  },
  {
    metric: "Facebook & Instagram",
    points: CHANNEL_MAX_POINTS,
    source: "automatic",
    detail: "1pt for a Reel in the last 7 days, 1pt for posting anything at all — not one point per post.",
  },
  {
    metric: "TikTok",
    points: TIKTOK_MAX_POINTS,
    source: "automatic",
    detail:
      "1pt each for posting within 48 hours / 7 / 14 / 30 days (these stack), plus 1pt for the best-performing post nationally that week (moves to a new seat weekly).",
  },
  {
    metric: "Newsletter",
    points: NEWSLETTER_MAX_POINTS,
    source: "automatic",
    detail: "Sent since the 1st of this calendar month.",
  },
  {
    metric: "Facebook Group posts",
    points: GROUP_MAX_POINTS,
    source: "manual",
    detail: (
      <>
        🔴 0 posts = 0. 🟠 1 post = 1. 🟢 2+ posts = {GROUP_MAX_POINTS}, this week. Log it in{" "}
        <a href="/admin/facebook-group" className="underline hover:text-black dark:hover:text-white">
          Facebook Group manual reporting
        </a>
        .
      </>
    ),
  },
  {
    metric: "Subscriber growth",
    points: SUBSCRIBER_MAX_POINTS,
    source: "manual",
    detail: (
      <>
        Grew the list by {SUBSCRIBER_GROWTH_TARGET}+ versus last month. Log it monthly in{" "}
        <a href="/admin/subscribers" className="underline hover:text-black dark:hover:text-white">
          Subscriber counts
        </a>
        . Not live for anyone yet — needs two consecutive approved months to compare.
      </>
    ),
  },
];

export default function ScoringPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">How scoring works</h1>
        <p className="mt-2 text-black/70 dark:text-white/70">
          Living document — this is always the source of truth for how the numbers on Rankings and
          Constituency Detail are calculated. Overall score is out of {TOTAL_POINTS} points.
        </p>
      </div>

      <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-5 dark:border-indigo-900 dark:bg-indigo-950/40">
        <h2 className="text-lg font-semibold tracking-tight text-indigo-900 dark:text-indigo-200">
          The Dream Week
        </h2>
        <p className="mt-2 text-sm text-indigo-900/80 dark:text-indigo-200/80">
          The gold standard for local digital campaigning — what a high-performing Labour MP
          office should realistically be doing every week online. The benchmark:
        </p>
        <ul className="ml-4 mt-2 list-disc space-y-1 text-sm text-indigo-900/80 dark:text-indigo-200/80">
          <li>
            5 organic Facebook and Instagram feed posts (suggested content; visit videos, photos,
            long reads)
          </li>
          <li>2 TikToks (national policy)</li>
          <li>1 localised selfie videos for Facebook</li>
          <li>
            Always on ad campaign (spending roughly £100 per month) (one Lead Generation ad and
            best performing piece of organic content)
          </li>
          <li>3 Facebook group posts per week</li>
          <li>Building local friendly Facebook spaces</li>
          <li>Small group of amplifiers</li>
          <li>Monthly email newsletter programme</li>
          <li>Consistently growing email subscribers and active supporters lists</li>
        </ul>
      </div>

      <div>
        <h2 className="text-lg font-semibold tracking-tight">Points breakdown</h2>
        <div className="mt-3 overflow-x-auto rounded-lg border border-black/10 dark:border-white/15">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/10 bg-black/[.02] dark:border-white/15 dark:bg-white/[.04]">
              <tr>
                <th className="px-4 py-3 font-medium">Metric</th>
                <th className="px-4 py-3 font-medium">Points</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">How it&apos;s scored</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.metric} className="border-b border-black/5 last:border-0 dark:border-white/10">
                  <td className="px-4 py-3 font-medium">{row.metric}</td>
                  <td className="px-4 py-3 tabular-nums">{row.points}</td>
                  <td className="px-4 py-3">
                    <SourceTag kind={row.source} />
                  </td>
                  <td className="px-4 py-3 text-black/70 dark:text-white/70">{row.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-black/50 dark:text-white/50">
          No data resolved yet for a metric (no advertiser matched, no TikTok account, no approved
          manual entry) counts as 0 of its points rather than being excluded — except when a seat
          has no data on any point-scored metric, which shows &quot;No data&quot; instead of a
          misleading 0.
        </p>
      </div>

      <div className="rounded-lg border border-black/10 p-5 dark:border-white/15">
        <h2 className="text-lg font-semibold tracking-tight">Rank &amp; change</h2>
        <p className="mt-2 text-sm text-black/70 dark:text-white/70">
          Rank is the overall score sorted highest to lowest, ties sharing a rank. Change is this
          week&apos;s score minus last week&apos;s, or &quot;unavailable&quot; with no prior week
          to compare.
        </p>
      </div>
    </div>
  );
}
