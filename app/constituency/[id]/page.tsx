import { notFound } from "next/navigation";
import { getConstituencyDetail } from "@/lib/rankings";
import { formatDateTime, formatPeriodLabel } from "@/lib/format";
import ScoreBar from "@/app/components/ScoreBar";
import ChangeIndicator from "@/app/components/ChangeIndicator";
import { platformColor } from "@/app/components/platformColors";
import MetricCard from "./MetricCard";
import ActivityCharts from "./ActivityCharts";

const ORGANIC_PLATFORMS = ["Facebook", "Instagram", "TikTok", "YouTube"];

export default async function ConstituencyDetailPage({
  params,
  searchParams,
}: PageProps<"/constituency/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const period = typeof sp.period === "string" ? sp.period : undefined;

  const detail = await getConstituencyDetail(id, period);
  if (!detail) notFound();

  const { constituency, current, targetPeriod } = detail;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{constituency.name}</h1>
          <p className="mt-1 text-black/70 dark:text-white/70">
            {constituency.mp_or_candidate_name || "MP/candidate not yet known"} · {constituency.region}
            {constituency.cohort && ` · ${constituency.cohort}`}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm">
            {(
              [
                ["Facebook", constituency.facebook_url],
                ["Instagram", constituency.instagram_url],
                ["TikTok", constituency.tiktok_url],
                ["X", constituency.x_url],
              ] as const
            ).map(
              ([label, url]) =>
                url && (
                  <a
                    key={label}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    {label}
                  </a>
                )
            )}
          </div>
        </div>
        <div className="text-right text-sm text-black/50 dark:text-white/50">
          <p>{targetPeriod ? formatPeriodLabel(targetPeriod) : "No activity tracked yet"}</p>
          <p>Data last updated: {formatDateTime(detail.lastUpdated)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-black/10 p-4 dark:border-white/15">
          <p className="text-sm font-medium text-black/70 dark:text-white/70">Overall score</p>
          <div className="mt-2">
            <ScoreBar score={detail.score} />
          </div>
        </div>
        <div className="rounded-lg border border-black/10 p-4 dark:border-white/15">
          <p className="text-sm font-medium text-black/70 dark:text-white/70">
            Change vs previous period
          </p>
          <div className="mt-2">
            <ChangeIndicator delta={detail.change.delta} direction={detail.change.direction} />
          </div>
        </div>
        <div className="rounded-lg border border-black/10 p-4 dark:border-white/15">
          <p className="text-sm font-medium text-black/70 dark:text-white/70">National rank</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            {detail.nationalRank}{" "}
            <span className="text-sm font-normal text-black/50 dark:text-white/50">
              of {detail.nationalCount}
            </span>
          </p>
        </div>
        <div className="rounded-lg border border-black/10 p-4 dark:border-white/15">
          <p className="text-sm font-medium text-black/70 dark:text-white/70">Regional rank</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            {detail.regionalRank}{" "}
            <span className="text-sm font-normal text-black/50 dark:text-white/50">
              of {detail.regionalCount} in {constituency.region}
            </span>
          </p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold tracking-tight">Platform breakdown</h2>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          {targetPeriod ? `For ${formatPeriodLabel(targetPeriod)}` : "No data reported yet"}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {ORGANIC_PLATFORMS.map((platform) => {
            const p = current.organic.byPlatform.find((x) => x.platform === platform);
            return (
              <MetricCard
                key={platform}
                title={platform}
                accentColor={platformColor(platform)}
                hasData={p?.hasData ?? false}
                primary={`${p?.postCount ?? 0} posts`}
              />
            );
          })}
          <MetricCard
            title="Paid advertising"
            hasData={current.adSpend.hasData}
            primary={`£${current.adSpend.spent.toLocaleString()} of £${current.adSpend.target.toLocaleString()}`}
            secondary={
              current.adSpend.hasData
                ? `${Math.round((current.adSpend.spent / (current.adSpend.target || 1)) * 100)}% of target`
                : undefined
            }
          />
          <MetricCard
            title="Facebook group activity"
            hasData={current.group.hasData}
            primary={`${current.group.postCount} posts`}
          />
          <MetricCard
            title="Newsletter"
            hasData={current.newsletter.hasData}
            primary={`${current.newsletter.sendCount} sent this week`}
          />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold tracking-tight">Activity over time</h2>
        {detail.history.length > 0 ? (
          <div className="mt-4 rounded-lg border border-black/10 p-4 dark:border-white/15">
            <ActivityCharts history={detail.history} />
          </div>
        ) : (
          <p className="mt-4 rounded-lg border border-dashed border-black/20 p-6 text-center text-sm text-black/50 dark:border-white/20 dark:text-white/50">
            Charts will appear here once activity has been tracked for a few weeks.
          </p>
        )}
      </div>
    </div>
  );
}
