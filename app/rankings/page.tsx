import Link from "next/link";
import { getRankings, getProgrammeTotals } from "@/lib/rankings";
import { beaconAuthEnabled, getBeaconUser } from "@/lib/beaconAuth";
import { canUseAdmin } from "@/lib/beaconSession";
import { adPointsMultiplier } from "@/lib/adRecency";
import { formatDateTime, formatPeriodLabel } from "@/lib/format";
import RankingsFilters from "./RankingsFilters";
import RankingsTable from "./RankingsTable";
import ProgrammeTotalsTable from "./ProgrammeTotalsTable";
import RankingsExport from "./RankingsExport";

export default async function RankingsPage({
  searchParams,
}: PageProps<"/rankings">) {
  const params = await searchParams;
  const region = typeof params.region === "string" ? params.region : undefined;
  const cohort = typeof params.cohort === "string" ? params.cohort : undefined;
  const period = typeof params.period === "string" ? params.period : undefined;

  // "All weeks combined" adds every tracked week together; any other value is a single week.
  const showAllWeeks = period === "all";
  const totals = showAllWeeks ? await getProgrammeTotals({ region, cohort }) : null;
  const weekly = showAllWeeks ? null : await getRankings({ region, cohort, period });
  const data = (totals ?? weekly)!;

  // The CSV download is for staff and admins only; MP-team (client) accounts don't see it.
  const user = beaconAuthEnabled() ? await getBeaconUser() : null;
  const canExport = !beaconAuthEnabled() || (user !== null && canUseAdmin(user.role));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Rankings</h1>
          <p className="mt-2 max-w-2xl text-black/70 dark:text-white/70">
            {totals ? (
              <>
                Every tracked week added together
                {totals.weeks.length > 0 && (
                  <>
                    {" "}({formatPeriodLabel({ start: totals.weeks[0].start, end: totals.weeks[totals.weeks.length - 1].end })},
                    {" "}{totals.weeks.length} weeks, the latest still in progress)
                  </>
                )}
                . Scores are summed exactly as on the weekly view.{" "}
                <Link href="/scoring" className="underline hover:text-black dark:hover:text-white">
                  See how scoring works
                </Link>
                .
              </>
            ) : weekly?.targetPeriod ? (
              <>
                National leaderboard for {formatPeriodLabel(weekly.targetPeriod)}. Scores are a
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
        <p className="whitespace-nowrap text-sm text-black/50 dark:text-white/50">
          Data last updated: {formatDateTime(data.lastUpdated)}
        </p>
      </div>

      {weekly?.targetPeriod && adPointsMultiplier(weekly.targetPeriod.start) > 1 && (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
          Ads push: ads are worth double this week (4 points instead of 2), so the maximum score is 19.
        </p>
      )}

      <RankingsFilters
        regions={data.regions}
        cohorts={data.cohorts}
        periods={data.periods}
        current={{ region, cohort, period: totals ? "all" : weekly?.targetPeriod?.start }}
      />

      {canExport && <RankingsExport regions={data.regions} periods={data.periods} currentRegion={region} />}

      {totals ? (
        <ProgrammeTotalsTable rows={totals.rows} weekCount={totals.weeks.length} />
      ) : (
        weekly && <RankingsTable rows={weekly.rows} />
      )}
    </div>
  );
}
