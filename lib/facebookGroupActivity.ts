import { sql } from "./db";

// Manual entry for Facebook Group posts — the one part of "organic
// Facebook & Instagram" activity that still has no automated source
// (Hani's warehouse covers feed posts, not group posts). Submissions
// land as 'pending' — has_data stays false, so nothing changes on the
// tracker — until Jen or Alex approves, either from the email link or
// the Admin queue below.
export type FacebookGroupStatus = "pending" | "approved" | "rejected";

export type FacebookGroupEntry = {
  id: string;
  constituencyId: string;
  constituencyName: string;
  periodStart: string;
  periodEnd: string;
  postCount: number | null;
  postUrl: string | null;
  hasScreenshot: boolean;
  hasData: boolean;
  status: FacebookGroupStatus;
  approvalToken: string;
  approvedBy: string | null;
  approvedAt: string | null;
};

export type FacebookGroupInput = {
  constituencyId: string;
  periodStart: string;
  periodEnd: string;
  postCount: number | null;
  postUrl: string | null;
  /** Omit to leave an existing screenshot untouched (e.g. editing other fields without re-uploading). */
  screenshot?: { data: Buffer; contentType: string } | null;
};

type Row = {
  id: string;
  constituency_id: string;
  constituency_name: string;
  period_start: string;
  period_end: string;
  post_count: number | null;
  post_url: string | null;
  has_screenshot: boolean;
  has_data: boolean;
  status: FacebookGroupStatus;
  approval_token: string;
  approved_by: string | null;
  approved_at: string | null;
};

function toEntry(r: Row): FacebookGroupEntry {
  return {
    id: r.id,
    constituencyId: r.constituency_id,
    constituencyName: r.constituency_name,
    periodStart: r.period_start,
    periodEnd: r.period_end,
    postCount: r.post_count,
    postUrl: r.post_url,
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
    fga.id::text, fga.constituency_id, c.name as constituency_name,
    fga.period_start::text, fga.period_end::text,
    fga.post_count, fga.post_url, (fga.screenshot_data is not null) as has_screenshot,
    fga.has_data, fga.status, fga.approval_token::text,
    fga.approved_by, fga.approved_at::text
  from facebook_group_activity fga
  join constituencies c on c.id = fga.constituency_id
`;

export async function listFacebookGroupEntries(): Promise<FacebookGroupEntry[]> {
  const rows = await sql<Row[]>`${SELECT} order by fga.period_start desc, c.name asc`;
  return rows.map(toEntry);
}

export async function listPendingFacebookGroupEntries(): Promise<FacebookGroupEntry[]> {
  const rows = await sql<Row[]>`${SELECT} where fga.status = 'pending' order by fga.created_at asc`;
  return rows.map(toEntry);
}

export async function getFacebookGroupEntry(
  constituencyId: string,
  periodStart: string
): Promise<FacebookGroupEntry | undefined> {
  const rows = await sql<Row[]>`
    ${SELECT} where fga.constituency_id = ${constituencyId} and fga.period_start = ${periodStart}
  `;
  return rows[0] ? toEntry(rows[0]) : undefined;
}

async function getEntryByToken(token: string): Promise<FacebookGroupEntry | undefined> {
  const rows = await sql<Row[]>`${SELECT} where fga.approval_token = ${token}`;
  return rows[0] ? toEntry(rows[0]) : undefined;
}

export async function getFacebookGroupScreenshot(
  id: string
): Promise<{ data: Buffer; contentType: string } | null> {
  const rows = await sql<{ screenshot_data: Buffer | null; screenshot_content_type: string | null }[]>`
    select screenshot_data, screenshot_content_type from facebook_group_activity where id = ${id}
  `;
  if (!rows[0]?.screenshot_data) return null;
  return { data: rows[0].screenshot_data, contentType: rows[0].screenshot_content_type ?? "image/jpeg" };
}

/** Always lands as 'pending' — never counts toward the tracker until approved. Returns the entry so the caller can email the approval links. */
export async function submitFacebookGroupEntry(input: FacebookGroupInput): Promise<FacebookGroupEntry> {
  const screenshotData = input.screenshot?.data ?? null;
  const screenshotContentType = input.screenshot?.contentType ?? null;

  const [row] = await sql<Row[]>`
    insert into facebook_group_activity (
      constituency_id, period_start, period_end, post_count, post_url,
      screenshot_data, screenshot_content_type, source, has_data, status
    ) values (
      ${input.constituencyId}, ${input.periodStart}, ${input.periodEnd}, ${input.postCount}, ${input.postUrl},
      ${screenshotData}, ${screenshotContentType}, 'manual', false, 'pending'
    )
    on conflict (constituency_id, period_start) do update set
      period_end = excluded.period_end,
      post_count = excluded.post_count,
      post_url = excluded.post_url,
      screenshot_data = coalesce(excluded.screenshot_data, facebook_group_activity.screenshot_data),
      screenshot_content_type = coalesce(excluded.screenshot_content_type, facebook_group_activity.screenshot_content_type),
      has_data = false,
      status = 'pending',
      approval_token = gen_random_uuid(),
      approved_by = null,
      approved_at = null
    returning id::text, constituency_id, period_start::text, period_end::text, post_count, post_url,
      (screenshot_data is not null) as has_screenshot, has_data, status, approval_token::text, approved_by, approved_at::text
  `;
  const [withName] = await sql<{ constituency_name: string }[]>`
    select name as constituency_name from constituencies where id = ${row.constituency_id}
  `;
  return toEntry({ ...row, constituency_name: withName.constituency_name });
}

export async function approveFacebookGroupEntry(token: string, approvedBy: string): Promise<FacebookGroupEntry | null> {
  const entry = await getEntryByToken(token);
  if (!entry || entry.status !== "pending") return entry ?? null;

  await sql`
    update facebook_group_activity set
      status = 'approved',
      has_data = (post_count is not null),
      approved_by = ${approvedBy},
      approved_at = now()
    where approval_token = ${token}
  `;
  return getEntryByToken(token) as Promise<FacebookGroupEntry>;
}

export async function rejectFacebookGroupEntry(token: string, approvedBy: string): Promise<FacebookGroupEntry | null> {
  const entry = await getEntryByToken(token);
  if (!entry || entry.status !== "pending") return entry ?? null;

  await sql`
    update facebook_group_activity set
      status = 'rejected',
      has_data = false,
      approved_by = ${approvedBy},
      approved_at = now()
    where approval_token = ${token}
  `;
  return getEntryByToken(token) as Promise<FacebookGroupEntry>;
}

export async function deleteFacebookGroupEntry(constituencyId: string, periodStart: string): Promise<void> {
  await sql`
    delete from facebook_group_activity
    where constituency_id = ${constituencyId} and period_start = ${periodStart}
  `;
}
