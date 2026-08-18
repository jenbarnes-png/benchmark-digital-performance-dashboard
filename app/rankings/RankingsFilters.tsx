"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { Period } from "@/lib/rankings";
import { formatPeriodLabel } from "@/lib/format";

export default function RankingsFilters({
  regions,
  cohorts,
  periods,
  current,
}: {
  regions: string[];
  cohorts: string[];
  periods: Period[];
  current: { region?: string; cohort?: string; period?: string };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-black/70 dark:text-white/70">Region</span>
        <select
          value={current.region ?? ""}
          onChange={(e) => update("region", e.target.value)}
          className="rounded-md border border-black/15 bg-transparent px-3 py-1.5 text-sm dark:border-white/20"
        >
          <option value="">All regions</option>
          {regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-black/70 dark:text-white/70">Cohort</span>
        <select
          value={current.cohort ?? ""}
          onChange={(e) => update("cohort", e.target.value)}
          className="rounded-md border border-black/15 bg-transparent px-3 py-1.5 text-sm dark:border-white/20"
        >
          <option value="">All cohorts</option>
          {cohorts.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      {periods.length > 0 && (
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-black/70 dark:text-white/70">Period</span>
          <select
            value={current.period ?? ""}
            onChange={(e) => update("period", e.target.value)}
            className="rounded-md border border-black/15 bg-transparent px-3 py-1.5 text-sm dark:border-white/20"
          >
            {periods.map((p) => (
              <option key={p.start} value={p.start}>
                {formatPeriodLabel(p)}
              </option>
            ))}
          </select>
        </label>
      )}

      {(current.region || current.cohort) && (
        <button
          onClick={() => router.push(pathname)}
          className="text-sm font-medium text-black/60 hover:underline dark:text-white/60"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
