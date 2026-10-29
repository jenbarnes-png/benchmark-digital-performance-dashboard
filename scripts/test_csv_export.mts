// Checks the CSV export. Run: npm run test:csv
import { toCsv } from "../lib/csv";
import { rankingsFileName, RANKINGS_CSV_HEADERS, rankingRowToRecord } from "../lib/rankingsExport";

const out = toCsv(["a", "b"], [["x, y", 'say "hi"'], ["=1+1", "@cmd"], [null, 3]]);
const lines = out.replace("﻿", "").trimEnd().split("\r\n");

const checks: [string, boolean][] = [
  ["starts with a byte-order mark so Excel reads accents", out.startsWith("﻿")],
  ["quotes values containing commas", lines[1].startsWith('"x, y"')],
  ["doubles quotes inside values", lines[1].includes('"say ""hi"""')],
  ["defuses text that starts with =", lines[2].startsWith(`"'=1+1"`)],
  ["defuses text that starts with @", lines[2].includes(`"'@cmd"`)],
  ["blank for no value, number kept", lines[3] === '"","3"'],
  ["file name for one region", rankingsFileName("2026-10-05", "2026-10-26", "Yorkshire and The Humber") === "rankings_2026-10-05_to_2026-10-26_Yorkshire-and-The-Humber.csv"],
  ["file name for all regions", rankingsFileName("2026-10-05", "2026-10-26") === "rankings_2026-10-05_to_2026-10-26_all-regions.csv"],
  ["every row has one value per header", (() => {
    const row = rankingRowToRecord({ start: "2026-10-05", end: "2026-10-11" }, {
      constituency: { id: "1", name: "Test", mp_or_candidate_name: "A MP", region: "Wales" },
      rank: 1, score: 5, scoreMaxPoints: 17, previousScore: 4, change: { delta: 1, direction: "up" }, adLive: true,
      tiktok: { points: 2, hasData: true, reach: 10, postedInLast30Days: true, postedInLast7Days: false, isBestPostWinner: false },
      channel: { points: 1, hasData: true, reelIn7Days: false, postedIn7Days: true },
      newsletterActivity: { points: 0, hasData: false, sentInLast30Days: false, sentThisCalendarMonth: false },
      group: { hasData: false, postCount: 0 },
      amplifiers: { points: 0, hasData: false, established: false, activeThisWeek: false, memberCount: null },
      subscriberGrowth: { points: 0, hasData: false, grewByAtLeastTarget: false, listSize: null, listSizeMonth: null, listChange: null },
    } as never);
    return row.length === RANKINGS_CSV_HEADERS.length;
  })()],
];
let failed = 0;
for (const [name, ok] of checks) { if (!ok) failed++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}`); }
console.log(failed ? `\n${failed} FAILED.` : "\nAll cases passed.");
process.exitCode = failed ? 1 : 0;
