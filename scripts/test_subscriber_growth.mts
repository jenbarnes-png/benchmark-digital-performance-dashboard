// Checks the subscriber-growth rule against known cases. Run: npm run test:growth
// Prints PASS or FAIL for each case, and exits with an error if any fail.
import { computeSubscriberGrowth as growth, type DeclaredCount } from "../lib/subscriberGrowth";

const oct = new Date("2026-10-20T12:00:00Z");
const nov = new Date("2026-11-10T12:00:00Z");
const c = (month: string, count: number): DeclaredCount => ({ month, count });

const cases: [string, DeclaredCount[] | undefined, Date, Record<string, unknown>][] = [
  ["no counts yet", undefined, oct, { hasComparison: false, listSize: null }],
  ["one October count is just the starting point", [c("2026-10-01", 1000)], oct, { hasComparison: false, listSize: 1000 }],
  ["+15 is below the 20 target", [c("2026-10-01", 1000), c("2026-10-01", 1015)], oct, { hasComparison: true, grewByAtLeastTarget: false, listChange: 15 }],
  ["exactly +20 earns the point", [c("2026-10-01", 1000), c("2026-10-01", 1020)], oct, { grewByAtLeastTarget: true, listChange: 20 }],
  ["uses the latest of several counts", [c("2026-10-01", 1000), c("2026-10-01", 1010), c("2026-10-01", 1040)], oct, { grewByAtLeastTarget: true, listChange: 40, listSize: 1040 }],
  ["a shrinking list does not score", [c("2026-10-01", 1000), c("2026-10-01", 950)], oct, { grewByAtLeastTarget: false, listChange: -50 }],
  ["November compares with October's latest count", [c("2026-10-01", 1000), c("2026-10-01", 1040), c("2026-11-01", 1055)], nov, { grewByAtLeastTarget: false, listChange: 15 }],
  ["November with no November count yet shows October's size", [c("2026-10-01", 1000), c("2026-10-01", 1040)], nov, { hasComparison: false, listSize: 1040, listSizeMonth: "2026-10-01" }],
  ["an October week ignores a later November count", [c("2026-10-01", 1000), c("2026-11-01", 2000)], oct, { hasComparison: false, listSize: 1000 }],
];

let failed = 0;
for (const [name, declared, when, expected] of cases) {
  const actual = growth(declared, when) as Record<string, unknown>;
  const ok = Object.entries(expected).every(([key, value]) => actual[key] === value);
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  (got ${JSON.stringify(actual)})`}`);
}
console.log(failed ? `\n${failed} case(s) FAILED.` : "\nAll cases passed.");
process.exitCode = failed ? 1 : 0;
