// Checks the reminder email text. Run: npm run test:digest
import { buildPendingDigest, type PendingApproval } from "../lib/pendingDigest";

const now = new Date("2026-10-16T09:00:00Z");
const item = (kind: PendingApproval["kind"], daysAgo: number): PendingApproval => ({
  kind, constituency: "Rutherglen", detail: "4 posts", reviewPath: "/admin/x/approve/abc",
  submittedAt: new Date(now.getTime() - daysAgo * 86_400_000).toISOString(),
});
const one = buildPendingDigest([item("Amplifier group", 0)], "https://example.com", now);
const many = buildPendingDigest([item("Facebook Group posts", 3), item("Subscriber count", 1)], "https://example.com", now);

const checks: [string, boolean][] = [
  ["one report: singular subject", one.subject === "1 manual report waiting for your approval"],
  ["two reports: plural subject", many.subject === "2 manual reports waiting for your approval"],
  ["says 'today' for a fresh report", one.body.includes("sent today")],
  ["says '3 days ago' and '1 day ago'", many.body.includes("3 days ago") && many.body.includes("1 day ago")],
  ["includes the review link", one.body.includes("https://example.com/admin/x/approve/abc")],
  ["explains it doesn't count until approved", one.body.includes("None of them count toward the scores until you approve")],
];
let failed = 0;
for (const [name, ok] of checks) { if (!ok) failed++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}`); }
console.log(failed ? `\n${failed} FAILED.` : "\nAll cases passed.");
process.exitCode = failed ? 1 : 0;
