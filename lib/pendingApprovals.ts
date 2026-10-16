import { sql } from "./db";
import type { PendingApproval } from "./pendingDigest";

// Everything typed in by hand that is waiting for an approver. Used by the daily
// reminder email (scripts/notify_pending_approvals.mts).

type Row = { constituency: string; detail: string; submitted_at: string; token: string };

export async function listPendingApprovals(): Promise<PendingApproval[]> {
  const [group, subscribers, amplifiers] = await Promise.all([
    sql<Row[]>`
      select c.name as constituency,
        coalesce(f.post_count::text, '?') || ' posts, week of ' || to_char(f.period_start, 'DD Mon') as detail,
        f.created_at::text as submitted_at, f.approval_token::text as token
      from facebook_group_activity f join constituencies c on c.id = f.constituency_id
      where f.status = 'pending'`,
    sql<Row[]>`
      select c.name as constituency,
        coalesce(s.subscriber_count::text, '?') || ' subscribers' as detail,
        s.created_at::text as submitted_at, s.approval_token::text as token
      from subscriber_counts s join constituencies c on c.id = s.constituency_id
      where s.status = 'pending'`,
    sql<Row[]>`
      select c.name as constituency,
        coalesce(a.member_count::text, '?') || ' members, ' || coalesce(a.post_count::text, '?') || ' posts, week of ' || to_char(a.period_start, 'DD Mon') as detail,
        a.created_at::text as submitted_at, a.approval_token::text as token
      from amplifier_group_reports a join constituencies c on c.id = a.constituency_id
      where a.status = 'pending'`,
  ]);

  const items: PendingApproval[] = [
    ...group.map((r) => ({ kind: "Facebook Group posts" as const, constituency: r.constituency, detail: r.detail, submittedAt: r.submitted_at, reviewPath: `/admin/facebook-group/approve/${r.token}` })),
    ...subscribers.map((r) => ({ kind: "Subscriber count" as const, constituency: r.constituency, detail: r.detail, submittedAt: r.submitted_at, reviewPath: `/admin/subscribers/approve/${r.token}` })),
    ...amplifiers.map((r) => ({ kind: "Amplifier group" as const, constituency: r.constituency, detail: r.detail, submittedAt: r.submitted_at, reviewPath: `/admin/amplifiers/approve/${r.token}` })),
  ];
  return items.sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
}
