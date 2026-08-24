import nodemailer from "nodemailer";

// Sends via Google Workspace SMTP using an App Password on a
// fouroneone.co.uk account. Set these in .env.local:
//   GMAIL_SMTP_USER=you@fouroneone.co.uk
//   GMAIL_SMTP_APP_PASSWORD=<16-character App Password>
// (Google Account → Security → 2-Step Verification must be on → App
// Passwords → generate one for "Mail".) Until both are set, sends are
// skipped with a console warning rather than throwing — approvals still
// work from the Admin queue in the meantime.
const APPROVAL_RECIPIENTS = ["jenbarnes@fouroneone.co.uk", "alexcreighton@fouroneone.co.uk"];

function getTransport() {
  const user = process.env.GMAIL_SMTP_USER;
  const pass = process.env.GMAIL_SMTP_APP_PASSWORD;
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });
}

export async function sendApprovalEmail(params: {
  constituencyName: string;
  periodLabel: string;
  postCount: number;
  reviewUrl: string;
}): Promise<{ sent: boolean }> {
  const transport = getTransport();
  if (!transport) {
    console.warn(
      "[email] GMAIL_SMTP_USER / GMAIL_SMTP_APP_PASSWORD not set — skipping approval email. Approve from Admin instead."
    );
    return { sent: false };
  }

  const from = process.env.GMAIL_SMTP_USER!;
  await transport.sendMail({
    from,
    to: APPROVAL_RECIPIENTS,
    subject: `Approve: ${params.constituencyName} — ${params.postCount} Facebook group post${params.postCount === 1 ? "" : "s"} (${params.periodLabel})`,
    text: [
      `${params.constituencyName} reported ${params.postCount} Facebook group post${params.postCount === 1 ? "" : "s"} for ${params.periodLabel}.`,
      "",
      `Review and approve or reject: ${params.reviewUrl}`,
      "",
      "This won't count toward the tracker until approved.",
    ].join("\n"),
  });
  return { sent: true };
}
