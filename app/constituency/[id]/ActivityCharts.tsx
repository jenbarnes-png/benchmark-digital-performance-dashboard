"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { platformColor } from "@/app/components/platformColors";
import { formatPeriodLabel } from "@/lib/format";
import { RECENT_WINDOW_DAYS } from "@/lib/adRecency";
import type { PeriodMetrics } from "@/lib/rankings";

const ORGANIC_PLATFORMS = ["Facebook", "Instagram", "TikTok", "YouTube"];

function weekLabel(period: string, periodEnd: string): string {
  return formatPeriodLabel({ start: period, end: periodEnd }).replace(/ \d{4}$/, "");
}

export default function ActivityCharts({ history }: { history: PeriodMetrics[] }) {
  const scoreData = history.map((h) => ({
    label: weekLabel(h.period, h.periodEnd),
    score: h.overall,
  }));

  const organicData = history.map((h) => {
    const row: Record<string, number | string> = { label: weekLabel(h.period, h.periodEnd) };
    for (const platform of ORGANIC_PLATFORMS) {
      const p = h.organic.byPlatform.find((x) => x.platform === platform);
      row[platform] = p?.hasData ? p.postCount : 0;
    }
    return row;
  });
  const organicComplete = history.map((h) => h.organic.hasData);

  const adSpendData = history.map((h) => ({
    label: weekLabel(h.period, h.periodEnd),
    spent: h.adSpend.hasData ? h.adSpend.spent : 0,
    target: h.adSpend.target,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h3 className="mb-3 text-sm font-semibold text-black/70 dark:text-white/70">
          Overall score over time
        </h3>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={scoreData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-black/10 dark:stroke-white/10" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value) => (value === null || value === undefined ? "No data" : value)}
              contentStyle={{ fontSize: 12 }}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#6366f1"
              strokeWidth={2}
              connectNulls={false}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
        <p className="mt-1 text-xs text-black/40 dark:text-white/40">
          Gaps in the line mean no data was available that week, not zero activity.
        </p>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-black/70 dark:text-white/70">
          Organic posts by platform
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={organicData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-black/10 dark:stroke-white/10" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {ORGANIC_PLATFORMS.map((platform) => (
              <Bar key={platform} dataKey={platform} stackId="posts" fill={platformColor(platform)} />
            ))}
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-2 flex items-center gap-1.5">
          <span className="text-xs text-black/40 dark:text-white/40">Data completeness:</span>
          {organicComplete.map((complete, i) => (
            <span
              key={i}
              title={complete ? "Data reported" : "No data reported"}
              className={`h-2 w-2 rounded-full ${complete ? "bg-emerald-500" : "bg-black/15 dark:bg-white/20"}`}
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-black/70 dark:text-white/70">
          Ad spend (trailing {RECENT_WINDOW_DAYS} days) vs target
        </h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={adSpendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-black/10 dark:stroke-white/10" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v) => `£${v}`} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="spent" name="Spent" fill="#6366f1" radius={[3, 3, 0, 0]} />
            <Bar dataKey="target" name="Target" fill="#d1d5db" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
