import Link from "next/link";
import { getRankings } from "@/lib/rankings";
import { formatDateTime, formatPeriodLabel } from "@/lib/format";
import RankingsFilters from "./RankingsFilters";
import RankingsTable from "./RankingsTable";
import RankingsPrint from "./RankingsPrint";
import PrintButton from "./PrintButton";

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
      <div className="print:hidden flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Rankings</h1>
          <p className="mt-2 max-w-2xl text-black/70 dark:text-white/70">
            {data.scope === "all-time" ? (
              <>
                Points accumulated across all {data.periodsCounted} tracked{" "}
                {data.periodsCounted === 1 ? "week" : "weeks"}. Teams tracked for longer
                have had more chances to score, so this rewards sustained activity
                rather than current form — the weekly views show that. The activity
                columns still describe the most recent week.{" "}
                <Link href="/scoring" className="underline hover:text-black dark:hover:text-white">
                  See how scoring works
                </Link>
                .
              </>
            ) : data.targetPeriod ? (
              <>
                National leaderboard for {formatPeriodLabel(data.targetPeriod)}. Scores are a
                provisional model —{" "}
                <Link href="/scoring" className="underline hover:text-black dark:hover:text-white">
                  see how scoring works
                </Link>
                .
              </>
            ) : (
              <>
                No activity has been tracked yet for these {data.rows.length} MPs. Once data starts
                coming in, this page will rank them automatically.
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <p className="whitespace-nowrap text-sm text-black/50 dark:text-white/50">
            Data last updated: {formatDateTime(data.lastUpdated)}
          </p>
          <PrintButton />
        </div>
      </div>

      <div className="print:hidden">
        <RankingsFilters
          regions={data.regions}
          cohorts={data.cohorts}
          periods={data.periods}
          current={{ region, cohort, period: data.targetPeriod?.start }}
        />
      </div>

      <div className="print:hidden">
        <RankingsTable rows={data.rows} />
      </div>

      <RankingsPrint
        rows={data.rows}
        periodLabel={
          data.scope === "all-time"
            ? `all time — ${data.periodsCounted} tracked ${data.periodsCounted === 1 ? "week" : "weeks"}`
            : data.targetPeriod
              ? formatPeriodLabel(data.targetPeriod)
              : null
        }
        generatedAt={formatDateTime(new Date().toISOString())}
        filters={{ region, cohort }}
      />
    </div>
  );
}
