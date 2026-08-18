import { getRankings } from "@/lib/rankings";
import { formatDateTime, formatPeriodLabel } from "@/lib/format";
import RankingsFilters from "./RankingsFilters";
import RankingsTable from "./RankingsTable";

export default async function RankingsPage({
  searchParams,
}: PageProps<"/rankings">) {
  const params = await searchParams;
  const region = typeof params.region === "string" ? params.region : undefined;
  const cohort = typeof params.cohort === "string" ? params.cohort : undefined;
  const period = typeof params.period === "string" ? params.period : undefined;

  const data = await getRankings({ region, cohort, period });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Rankings</h1>
          <p className="mt-2 max-w-2xl text-black/70 dark:text-white/70">
            National leaderboard for {formatPeriodLabel(data.targetPeriod)}. Scores are a
            provisional model — ad spend against target, other activity relative to the other
            pilot seats.
          </p>
        </div>
        <p className="whitespace-nowrap text-sm text-black/50 dark:text-white/50">
          Data last updated: {formatDateTime(data.lastUpdated)}
        </p>
      </div>

      <RankingsFilters
        regions={data.regions}
        cohorts={data.cohorts}
        periods={data.periods}
        current={{ region, cohort, period: data.targetPeriod.start }}
      />

      <RankingsTable rows={data.rows} />
    </div>
  );
}
