// Checks a newsletter dated today, or on a week's last day, counts as sent. Run: npm run test:newsletter
import { sentOnToTimestamp } from "../lib/newsletterDates";

// The scoring ignores anything dated after its reference time, so the stored time must not be later than it.
const counts = (sentOn: string, reference: string) => new Date(sentOnToTimestamp(sentOn)) <= new Date(reference);

const cases: [string, boolean][] = [
  ["logged on the morning it was sent (09:00 UTC) counts", counts("2026-10-29", "2026-10-29T09:00:00Z")],
  ["sent on a Sunday counts for that week (reference = start of Sunday)", counts("2026-10-25", "2026-10-25T00:00:00Z")],
  ["sent just after the reference does not count", !counts("2026-10-26", "2026-10-25T23:00:00Z")],
  ["stored as midnight UTC", sentOnToTimestamp("2026-10-29") === "2026-10-29T00:00:00Z"],
];
let failed = 0;
for (const [name, ok] of cases) { if (!ok) failed++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}`); }
console.log(failed ? `\n${failed} FAILED.` : "\nAll cases passed.");
process.exitCode = failed ? 1 : 0;
