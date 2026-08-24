import { AD_RECENCY_POINTS } from "@/lib/adRecency";
import { TIKTOK_MAX_POINTS } from "@/lib/tiktokScoring";
import { CHANNEL_MAX_POINTS } from "@/lib/channelScoring";
import { NEWSLETTER_MAX_POINTS } from "@/lib/newsletterScoring";

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
          <h3 className="pt-2 font-semibold text-indigo-900 dark:text-indigo-200">
            What does success look like?
          </h3>
          <p>
            One of the core structural ideas inside the programme is the &quot;Dream
            Week&quot; framework. This helps to define what a high performing Labour MP office
            should realistically be doing every week online.
          </p>
          <p>The benchmark includes:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>
              5 organic Facebook and Instagram feed posts (suggested content; visit videos,
              photos, long reads)
            </li>
            <li>2 TikToks (national policy)</li>
            <li>1 localised selfie videos for Facebook</li>
            <li>
              Always on ad campaign (spending roughly £100 per month) (one Lead Generation ad
              and best performing piece of organic content)
            </li>
            <li>3 Facebook group posts per week</li>
            <li>Building local friendly Facebook spaces</li>
            <li>Small group of amplifiers</li>
            <li>Monthly email newsletter programme</li>
            <li>Consistently growing email subscribers and active supporters lists</li>
          </ul>
        </div>
      </div>

      <Section title="Paid advertising (Meta)">
        <p>Live or not — matches the National Dashboard hex map:</p>
        <ul className="ml-4 list-disc space-y-1">
          <li>
            <span className="font-medium text-emerald-600 dark:text-emerald-400">🟢 Running an ad right now</span>{" "}
            — {AD_RECENCY_POINTS.active} points
          </li>
          <li>
            <span className="font-medium text-red-600 dark:text-red-400">🔴 No ad running right now</span> —{" "}
            {AD_RECENCY_POINTS.stale} points
          </li>
        </ul>
        <p className="text-xs text-black/50 dark:text-white/50">
          No advertiser matched yet? Shows &quot;no data&quot; here, counts as 0 overall.
        </p>
      </Section>

      <Section title="Facebook & Instagram">
        <p className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
          Live for the 28 pilot MPs
        </p>
        <p>
          Sourced from an internal data warehouse, refreshed every few hours. Scored out of{" "}
          {CHANNEL_MAX_POINTS} points, based on the last 7 days:
        </p>
        <ul className="ml-4 list-disc space-y-1">
          <li>Posted a Reel on Facebook or Instagram — 1 point</li>
          <li>Posted anything organically on either channel — 1 point</li>
        </ul>
        <p className="text-xs text-black/50 dark:text-white/50">
          Not one point per post — just whether it happened at all in the last 7 days.
        </p>
      </Section>

      <Section title="Newsletter">
        <p className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
          Live for the 28 pilot MPs
        </p>
        <p>
          Sourced from the same internal data warehouse. Scored out of {NEWSLETTER_MAX_POINTS}{" "}
          point:
        </p>
        <ul className="ml-4 list-disc space-y-1">
          <li>Sent within the last 30 days — 1 point</li>
        </ul>
        <p className="text-xs text-black/50 dark:text-white/50">
          Matches the Dream Week target of at least one newsletter a month.
        </p>
      </Section>

      <Section title="TikTok">
        <p className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
          Live for the 28 pilot MPs
        </p>
        <p>
          Sourced from an internal data warehouse, refreshed every few hours — TikTok has no
          public API we can pull ourselves. Scored out of {TIKTOK_MAX_POINTS} points:
        </p>
        <ul className="ml-4 list-disc space-y-1">
          <li>Posted within the last 48 hours — 1 point</li>
          <li>Posted within the last 7 days — 1 point</li>
          <li>Posted within the last 14 days — 1 point</li>
          <li>Posted within the last 30 days — 1 point</li>
          <li>Best-performing post nationally that week — 1 point</li>
        </ul>
        <p className="text-xs text-black/50 dark:text-white/50">
          The first four stack (post yesterday, get all four). The fifth moves to a new
          constituency each week — whoever posted the best video, not whoever held it last.
        </p>
      </Section>

      <Section title="Organic posting (manual entry), group activity & newsletter">
        <p>
          Scored relative to the best-performing pilot constituency that week — the top count
          scores 100, everyone else scales proportionally. A placeholder until better benchmarks
          exist, and separate from the automated Facebook &amp; Instagram score above — this
          covers manually-reported organic post counts, Facebook group posts, and newsletter
          sends, and doesn&apos;t currently count toward the overall points total.
        </p>
      </Section>

      <Section title="Rank & change">
        <p>
          Rank is the overall score sorted highest to lowest, ties sharing a rank. Change is this
          week&apos;s score minus last week&apos;s, or &quot;unavailable&quot; with no prior week
          to compare.
        </p>
      </Section>
    </div>
  );
}
