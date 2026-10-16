import { sql } from "./db";

// Manual reporting for amplifier groups (a supporters' group chat that amplifies an MP's posts).
// An MP's team submits a weekly report with a screenshot. It lands as 'pending' (has_data stays
// false, so nothing changes on the tracker) until an approver approves it, from the email link or
// the Admin queue. See lib/amplifierScoring.ts for how reports turn into points.
export type AmplifierStatus = "pending" | "approved" | "rejected";

export type AmplifierEntry = {
  id: string;
  constituencyId: string;
  constituencyName: string;
  periodStart: string;
  periodEnd: string;
  memberCount: number | null;
  postCount: number | null;
  notes: string | null;
  hasScreenshot: boolean;
  hasData: boolean;
  status: AmplifierStatus;
  approvalToken: string;
  approvedBy: string | null;
  approvedAt: string | null;
};

export type AmplifierInput = {
  constituencyId: string;
  periodStart: string;
  periodEnd: string;
  memberCount: number;
  postCount: number;
  notes: string | null;
  screenshot: { data: Buffer; contentType: string };
};

type Row = {
  id: string;
  constituency_id: string;
  constituency_name: string;
  period_start: string;
  period_end: string;
  member_count: number | null;
  post_count: number | null;
  notes: string | null;
  has_screenshot: boolean;
  has_data: boolean;
  status: AmplifierStatus;
  approval_token: string;
  approved_by: string | null;
  approved_at: string | null;
};

function toEntry(r: Row): AmplifierEntry {
  return {
    id: r.id,
    constituencyId: r.constituency_id,
    constituencyName: r.constituency_name,
    periodStart: r.period_start,
    periodEnd: r.period_end,
    memberCount: r.member_count,
    postCount: r.post_count,
    notes: r.notes,
    hasScreenshot: r.has_screenshot,
    hasData: r.has_data,
    status: r.status,
    approvalToken: r.approval_token,
    approvedBy: r.approved_by,
    approvedAt: r.approved_at,
  };
}

const SELECT = sql`
  select
    agr.id::text, agr.constituency_id, c.name as constituency_name,
    agr.period_start::text, agr.period_end::text,
    agr.member_count, agr.post_count, agr.notes,
    (agr.screenshot_data is not null) as has_screenshot,
    agr.has_data, agr.status, agr.approval_token::text,
    agr.approved_by, agr.approved_at::text
  from amplifier_group_reports agr
  join constituencies c on c.id = agr.constituency_id
`;

export async function listAmplifierEntries(): Promise<AmplifierEntry[]> {
  const rows = await sql<Row[]>`${SELECT} order by agr.period_start desc, c.name asc`;
  return rows.map(toEntry);
}

async function getEntryByToken(token: string): Promise<AmplifierEntry | undefined> {
  const rows = await sql<Row[]>`${SELECT} where agr.approval_token = ${token}`;
  return rows[0] ? toEntry(rows[0]) : undefined;
}

export async function getAmplifierEntryByToken(token: string): Promise<AmplifierEntry | undefined> {
  return getEntryByToken(token);
}

export async function getAmplifierScreenshot(id: string): Promise<{ data: Buffer; contentType: string } | null> {
  const rows = await sql<{ screenshot_data: Buffer | null; screenshot_content_type: string | null }[]>`
    select screenshot_data, screenshot_content_type from amplifier_group_reports where id = ${id}
  `;
  if (!rows[0]?.screenshot_data) return null;
  return { data: rows[0].screenshot_data, contentType: rows[0].screenshot_content_type ?? "image/jpeg" };
}

/**
 * Always lands as 'pending': it never counts until approved. One report per constituency per week;
 * sending another for the same week replaces the earlier one and goes back to pending.
 */
export async function submitAmplifierEntry(input: AmplifierInput): Promise<AmplifierEntry> {
  const [row] = await sql<Row[]>`
    insert into amplifier_group_reports (
      constituency_id, period_start, period_end, member_count, post_count, notes,
      screenshot_data, screenshot_content_type, source, has_data, status
    ) values (
      ${input.constituencyId}, ${input.periodStart}, ${input.periodEnd}, ${input.memberCount}, ${input.postCount}, ${input.notes},
      ${input.screenshot.data}, ${input.screenshot.contentType}, 'manual', false, 'pending'
    )
    on conflict (constituency_id, period_start) do update set
      period_end = excluded.period_end,
      member_count = excluded.member_count,
      post_count = excluded.post_count,
      notes = excluded.notes,
      screenshot_data = excluded.screenshot_data,
      screenshot_content_type = excluded.screenshot_content_type,
      has_data = false,
      status = 'pending',
      approval_token = gen_random_uuid(),
      approved_by = null,
      approved_at = null
    returning id::text, constituency_id, period_start::text, period_end::text, member_count, post_count, notes,
      (screenshot_data is not null) as has_screenshot, has_data, status, approval_token::text, approved_by, approved_at::text
  `;
  const [withName] = await sql<{ constituency_name: string }[]>`
    select name as constituency_name from constituencies where id = ${row.constituency_id}
  `;
  return toEntry({ ...row, constituency_name: withName.constituency_name });
}

export async function approveAmplifierEntry(token: string, approvedBy: string): Promise<AmplifierEntry | null> {
  const entry = await getEntryByToken(token);
  if (!entry || entry.status !== "pending") return entry ?? null;
  await sql`
    update amplifier_group_reports set
      status = 'approved',
      has_data = (member_count is not null),
      approved_by = ${approvedBy},
      approved_at = now()
    where approval_token = ${token}
  `;
  return getEntryByToken(token) as Promise<AmplifierEntry>;
}

export async function rejectAmplifierEntry(token: string, approvedBy: string): Promise<AmplifierEntry | null> {
  const entry = await getEntryByToken(token);
  if (!entry || entry.status !== "pending") return entry ?? null;
  await sql`
    update amplifier_group_reports set
      status = 'rejected',
      has_data = false,
      approved_by = ${approvedBy},
      approved_at = now()
    where approval_token = ${token}
  `;
  return getEntryByToken(token) as Promise<AmplifierEntry>;
}

export async function deleteAmplifierEntry(id: string): Promise<void> {
  await sql`delete from amplifier_group_reports where id = ${id}`;
}
