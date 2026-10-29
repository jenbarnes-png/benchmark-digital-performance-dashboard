import type { Period } from "@/lib/rankings";
import { formatPeriodLabel } from "@/lib/format";

// Download the rankings as a spreadsheet (CSV). A plain form: the browser sends the choices to
// /rankings/export and saves the file that comes back.
export default function RankingsExport({
  regions,
  periods,
  currentRegion,
}: {
  regions: string[];
  periods: Period[];
  currentRegion?: string;
}) {
  if (periods.length === 0) return null;
  const oldest = periods[periods.length - 1].start;
  const newest = periods[0].start;
  const selectClass = "rounded-md border border-black/15 bg-transparent px-3 py-1.5 text-sm dark:border-white/20";

  return (
    <details className="rounded-lg border border-black/10 p-4 dark:border-white/15">
      <summary className="cursor-pointer text-sm font-medium">Export to CSV (spreadsheet)</summary>
      <form action="/rankings/export" method="get" className="mt-4 flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-black/70 dark:text-white/70">From week</span>
          <select name="from" defaultValue={oldest} className={selectClass}>
            {[...periods].reverse().map((p) => (
              <option key={p.start} value={p.start}>{formatPeriodLabel(p)}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-black/70 dark:text-white/70">To week</span>
          <select name="to" defaultValue={newest} className={selectClass}>
            {periods.map((p) => (
              <option key={p.start} value={p.start}>{formatPeriodLabel(p)}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-black/70 dark:text-white/70">Region</span>
          <select name="region" defaultValue={currentRegion ?? ""} className={selectClass}>
            <option value="">All regions</option>
            {regions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
        >
          Download CSV
        </button>
        <p className="w-full text-xs text-black/50 dark:text-white/50">
          One row per MP per week, with their rank, score and each measure. A blank cell means there was no data, which is
          different from a 0.
        </p>
      </form>
    </details>
  );
}
