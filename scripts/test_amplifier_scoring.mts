// Checks the amplifier-group points rule against known cases. Run: npm run test:amplifiers
import { amplifierStatusForWeek as status, type AmplifierReport } from "../lib/amplifierScoring";

const r = (periodStart: string, memberCount: number | null, postCount: number | null): AmplifierReport => ({ periodStart, memberCount, postCount });
const W1 = "2026-10-12";
const W2 = "2026-10-19";

const cases: [string, AmplifierReport[] | undefined, string, Record<string, unknown>][] = [
  ["no reports: nothing earned, no data", undefined, W1, { hasData: false, points: 0 }],
  ["3 members and posts this week: 3 points", [r(W1, 3, 4)], W1, { established: true, activeThisWeek: true, points: 3 }],
  ["only 2 members: not established, 0 points", [r(W1, 2, 5)], W1, { established: false, activeThisWeek: false, points: 0 }],
  ["3 members but no posts this week: 2 points", [r(W1, 3, 0)], W1, { established: true, activeThisWeek: false, points: 2 }],
  ["established last week, no report this week: keeps the 2, not active", [r(W1, 5, 3)], W2, { established: true, activeThisWeek: false, points: 2 }],
  ["established last week, active again this week: 3", [r(W1, 5, 3), r(W2, 5, 2)], W2, { points: 3 }],
  ["group shrank below 3 in the latest report: loses the points", [r(W1, 5, 3), r(W2, 2, 4)], W2, { established: false, points: 0 }],
  ["a later week's report is ignored when viewing an earlier week", [r(W2, 6, 6)], W1, { hasData: false, points: 0 }],
  ["blank member count is not established", [r(W1, null, 3)], W1, { established: false, points: 0 }],
];

let failed = 0;
for (const [name, reports, week, expected] of cases) {
  const actual = status(reports, week) as Record<string, unknown>;
  const ok = Object.entries(expected).every(([k, v]) => actual[k] === v);
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  (got ${JSON.stringify(actual)})`}`);
}
console.log(failed ? `\n${failed} case(s) FAILED.` : "\nAll cases passed.");
process.exitCode = failed ? 1 : 0;
