import { sql } from "./db";

// Monthly subscriber-count manual entry — the only way to score "grew
// the list by 20+ this month", since no email platform is connected
// here. Same approval-gated pattern as facebook_group_activity:
// submissions land 'pending' (has_data stays false) until Jen or Alex
// approves.
export type SubscriberCountStatus = "pending" | "approved" | "rejected";

export type SubscriberCountEntry = {
  id: string;
  constituencyId: string;
  constituencyName: string;
  monthStart: string;
  monthEnd: string;
  subscriberCount: number | null;
  hasData: boolean;
  status: SubscriberCountStatus;
  approvalToken: string;
  approvedBy: string | null;
  approvedAt: string | null;
};

export type SubscriberCountInput = {
  constituencyId: string;
  monthStart: string;
  monthEnd: string;
  subscriberCount: number | null;
};

type Row = {
  id: string;
  constituency_id: string;
  constituency_name: string;
  month_start: string;
  month_end: string;
  subscriber_count: number | null;
  has_data: boolean;
  status: SubscriberCountStatus;
  approval_token: string;
  approved_by: string | null;
  approved_at: string | null;
};

function toEntry(r: Row): SubscriberCountEntry {
  return {
    id: r.id,
    constituencyId: r.constituency_id,
    constituencyName: r.constituency_name,
    monthStart: r.month_start,
    monthEnd: r.month_end,
    subscriberCount: r.subscriber_count,
    hasData: r.has_data,
    status: r.status,
    approvalToken: r.approval_token,
    approvedBy: r.approved_by,
    approvedAt: r.approved_at,
  };
}

const SELECT = sql`
  select
    sc.id::text, sc.constituency_id, c.name as constituency_name,
    sc.month_start::text, sc.month_end::text, sc.subscriber_count,
    sc.has_data, sc.status, sc.approval_token::text, sc.approved_by, sc.approved_at::text
  from subscriber_counts sc
  join constituencies c on c.id = sc.constituency_id
`;

export async function listSubscriberCountEntries(): Promise<SubscriberCountEntry[]> {
  const rows = await sql<Row[]>`${SELECT} order by sc.month_start desc, c.name asc`;
  return rows.map(toEntry);
}

export async function listPendingSubscriberCountEntries(): Promise<SubscriberCountEntry[]> {
  const rows = await sql<Row[]>`${SELECT} where sc.status = 'pending' order by sc.created_at asc`;
  return rows.map(toEntry);
}

export async function getSubscriberCountEntry(
  constituencyId: string,
  monthStart: string
): Promise<SubscriberCountEntry | undefined> {
  const rows = await sql<Row[]>`
    ${SELECT} where sc.constituency_id = ${constituencyId} and sc.month_start = ${monthStart}
  `;
  return rows[0] ? toEntry(rows[0]) : undefined;
}

async function getEntryByToken(token: string): Promise<SubscriberCountEntry | undefined> {
  const rows = await sql<Row[]>`${SELECT} where sc.approval_token = ${token}`;
  return rows[0] ? toEntry(rows[0]) : undefined;
}

/** Always lands as 'pending' — never counts toward scoring until approved. */
export async function submitSubscriberCountEntry(input: SubscriberCountInput): Promise<SubscriberCountEntry> {
  const [row] = await sql<Row[]>`
    insert into subscriber_counts (constituency_id, month_start, month_end, subscriber_count, source, has_data, status)
    values (${input.constituencyId}, ${input.monthStart}, ${input.monthEnd}, ${input.subscriberCount}, 'manual', false, 'pending')
    on conflict (constituency_id, month_start) do update set
      month_end = excluded.month_end,
      subscriber_count = excluded.subscriber_count,
      has_data = false,
      status = 'pending',
      approval_token = gen_random_uuid(),
      approved_by = null,
      approved_at = null
    returning id::text, constituency_id, month_start::text, month_end::text, subscriber_count, has_data, status, approval_token::text, approved_by, approved_at::text
  `;
  const [withName] = await sql<{ constituency_name: string }[]>`
    select name as constituency_name from constituencies where id = ${row.constituency_id}
  `;
  return toEntry({ ...row, constituency_name: withName.constituency_name });
}

export async function approveSubscriberCountEntry(
  token: string,
  approvedBy: string
): Promise<SubscriberCountEntry | null> {
  const entry = await getEntryByToken(token);
  if (!entry || entry.status !== "pending") return entry ?? null;

  await sql`
    update subscriber_counts set
      status = 'approved',
      has_data = (subscriber_count is not null),
      approved_by = ${approvedBy},
      approved_at = now()
    where approval_token = ${token}
  `;
  return getEntryByToken(token) as Promise<SubscriberCountEntry>;
}

export async function rejectSubscriberCountEntry(
  token: string,
  approvedBy: string
): Promise<SubscriberCountEntry | null> {
  const entry = await getEntryByToken(token);
  if (!entry || entry.status !== "pending") return entry ?? null;

  await sql`
    update subscriber_counts set
      status = 'rejected',
      has_data = false,
      approved_by = ${approvedBy},
      approved_at = now()
    where approval_token = ${token}
  `;
  return getEntryByToken(token) as Promise<SubscriberCountEntry>;
}

export async function deleteSubscriberCountEntry(constituencyId: string, monthStart: string): Promise<void> {
  await sql`
    delete from subscriber_counts
    where constituency_id = ${constituencyId} and month_start = ${monthStart}
  `;
}
