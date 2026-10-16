// Builds the text of the daily "reports waiting for approval" email. Pure (no database), so it can be tested on its own.

export type PendingApproval = {
  kind: "Facebook Group posts" | "Subscriber count" | "Amplifier group";
  constituency: string;
  detail: string;
  submittedAt: string;
  /** Path (not full URL) of the page where an approver reviews it. */
  reviewPath: string;
};

/** Builds the reminder email text. Pure, so it can be checked without sending anything. */
export function buildPendingDigest(items: PendingApproval[], baseUrl: string, now: Date = new Date()): { subject: string; body: string } {
  const days = (iso: string) => Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000));
  const lines = items.map((i) => {
    const waiting = days(i.submittedAt);
    const waitText = waiting === 0 ? "today" : waiting === 1 ? "1 day ago" : `${waiting} days ago`;
    return `- ${i.kind}: ${i.constituency} (${i.detail}), sent ${waitText}\n  ${baseUrl}${i.reviewPath}`;
  });
  return {
    subject: `${items.length} manual report${items.length === 1 ? "" : "s"} waiting for your approval`,
    body: [
      `${items.length} report${items.length === 1 ? " is" : "s are"} waiting for approval. None of them count toward the scores until you approve them.`,
      "",
      ...lines,
      "",
      `Or see everything in one place: ${baseUrl}/admin`,
      "(You'll need to be signed in to Project Beacon as staff.)",
    ].join("\n"),
  };
}
