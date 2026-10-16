// Emails the approvers a reminder when manual reports (Facebook Group posts, subscriber
// counts, amplifier groups) are waiting for approval. Sends NOTHING when nothing is waiting.
//
//   See what it would send, without sending:  npm run notify:pending:dry
//   Send it for real:                         npm run notify:pending
//
// Needs in .env.local: DATABASE_URL, APPROVAL_EMAILS (who to email), GMAIL_SMTP_USER and
// GMAIL_SMTP_APP_PASSWORD (the sending account; see .env.example). APP_BASE_URL is the
// site address used in the links. Runs daily on GitHub (see .github/workflows/remind-approvals.yml).
import { sql } from "../lib/db";
import { listPendingApprovals } from "../lib/pendingApprovals";
import { buildPendingDigest } from "../lib/pendingDigest";
import { sendReviewEmail } from "../lib/email";
import { requireEnv } from "../lib/env";
import { log } from "../lib/log";

const dryRun = process.argv.includes("--dry-run");

try {
  const items = await listPendingApprovals();
  if (items.length === 0) {
    log.info("approvals", "Nothing is waiting for approval, so no email was sent.");
  } else {
    const baseUrl = (process.env.APP_BASE_URL ?? "https://dashboard.project-beacon.co.uk").replace(/\/$/, "");
    const { subject, body } = buildPendingDigest(items, baseUrl);

    if (dryRun) {
      log.info("approvals", `DRY RUN: ${items.length} waiting. This is the email that would be sent:\n\nSubject: ${subject}\n\n${body}\n`);
    } else {
      // WARNING: the email password is a secret. Never print it.
      requireEnv("APPROVAL_EMAILS", "the list of people to remind", "Put the approvers' email addresses, separated by commas.");
      requireEnv("GMAIL_SMTP_USER", "the email account the reminders are sent from", "Use a fouroneone.co.uk address that has 2-Step Verification on.");
      requireEnv("GMAIL_SMTP_APP_PASSWORD", "the app password for that email account", "Google Account > Security > 2-Step Verification > App passwords > create one for Mail.");
      const result = await sendReviewEmail({ subject, body });
      if (!result.sent) throw new Error("The email was not sent (sending isn't set up). Check the three email settings above.");
      log.info("approvals", `Sent a reminder about ${items.length} waiting report(s). Success.`);
    }
  }
} catch (error) {
  log.error("approvals", `FAILED. ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  await sql.end();
}
