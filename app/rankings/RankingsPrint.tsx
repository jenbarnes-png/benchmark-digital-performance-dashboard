import type { RankingRow } from "@/lib/rankings";

/**
 * Print-only rendering of the rankings.
 *
 * The interactive table carries around eighteen columns, which is illegible on
 * A4. This shows the headline columns only — the ones someone reading a printed
 * leaderboard actually needs — plus a count of the weekly points earned so the
 * detail is summarised rather than lost.
 *
 * It is a separate component rather than CSS that hides columns, because
 * nth-child rules tied to column order silently break whenever a column is
 * added, and columns here are added fairly often.
 */

function arrow(direction: RankingRow["change"]["direction"]): string {
  if (direction === "up") return "▲";
  if (direction === "down") return "▼";
  if (direction === "flat") return "—";
  return "";
}

/** Headline count of this week's metrics met, so the detail columns are summarised. */
function pointsSummary(row: RankingRow): string {
  const met = [
    row.adLive,
    row.tiktok.hasData && row.tiktok.postedInLast7Days,
    row.channel.hasData && row.channel.reelIn7Days,
    row.channel.hasData && row.channel.postedIn7Days,
    row.newsletterActivity.hasData && row.newsletterActivity.sentInLast30Days,
    row.group.hasData && row.group.postCount > 0,
    row.subscriberGrowth.hasData && row.subscriberGrowth.grewByAtLeastTarget,
  ].filter(Boolean).length;
  return `${met}/7`;
}

export default function RankingsPrint({
  rows,
  periodLabel,
  generatedAt,
  filters,
}: {
  rows: RankingRow[];
  periodLabel: string | null;
  generatedAt: string;
  filters: { region?: string; cohort?: string };
}) {
  const applied = [
    filters.region ? `Region: ${filters.region}` : null,
    filters.cohort ? `Cohort: ${filters.cohort}` : null,
  ].filter(Boolean);

  return (
    <div className="print-only">
      <div style={{ marginBottom: "14px" }}>
        <h1 style={{ fontSize: "17pt", fontWeight: 700, margin: 0 }}>
          Project Beacon — Rankings
        </h1>
        <p style={{ fontSize: "9.5pt", color: "#444", margin: "4px 0 0" }}>
          {periodLabel ? `National leaderboard for ${periodLabel}. ` : ""}
          {applied.length > 0 ? `${applied.join(" · ")}. ` : "All regions and cohorts. "}
          {rows.length} {rows.length === 1 ? "MP" : "MPs"}.
        </p>
        <p style={{ fontSize: "8.5pt", color: "#777", margin: "2px 0 0" }}>
          Generated {generatedAt}. Scores are a provisional model — see
          project-beacon.co.uk for how scoring works.
        </p>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9pt" }}>
        <thead>
          <tr style={{ background: "#f2f2f2" }}>
            {[
              ["#", "right", "28px"],
              ["MP", "left", undefined],
              ["Constituency", "left", undefined],
              ["Region", "left", undefined],
              ["Score", "right", "52px"],
              ["Metrics met", "right", "64px"],
              ["Change", "right", "54px"],
            ].map(([label, align, width]) => (
              <th
                key={label as string}
                style={{
                  textAlign: align as "left" | "right",
                  padding: "5px 6px",
                  borderBottom: "1.5px solid #999",
                  fontWeight: 700,
                  width: width as string | undefined,
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.constituency.id}
              style={{
                background: i % 2 === 1 ? "#fafafa" : "transparent",
                borderBottom: "0.5px solid #e5e5e5",
              }}
            >
              <td style={{ textAlign: "right", padding: "4px 6px", fontVariantNumeric: "tabular-nums" }}>
                {row.rank}
              </td>
              <td style={{ padding: "4px 6px" }}>{row.constituency.mp_or_candidate_name ?? "—"}</td>
              <td style={{ padding: "4px 6px" }}>{row.constituency.name}</td>
              <td style={{ padding: "4px 6px", color: "#555" }}>{row.constituency.region}</td>
              <td style={{ textAlign: "right", padding: "4px 6px", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                {row.score === null ? "—" : `${row.score}/${row.scoreMaxPoints}`}
              </td>
              <td style={{ textAlign: "right", padding: "4px 6px", color: "#555", fontVariantNumeric: "tabular-nums" }}>
                {pointsSummary(row)}
              </td>
              <td style={{ textAlign: "right", padding: "4px 6px", fontVariantNumeric: "tabular-nums" }}>
                {arrow(row.change.direction)}
                {row.change.delta !== null && row.change.delta !== 0
                  ? ` ${Math.abs(row.change.delta)}`
                  : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {rows.length === 0 && (
        <p style={{ fontSize: "10pt", color: "#666", marginTop: "12px" }}>
          No ranked MPs for this selection.
        </p>
      )}
    </div>
  );
}
