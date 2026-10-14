import { randomUUID } from "node:crypto";
import { sql } from "./db";

// Short-term stand-in while newsletter detection is being rebuilt: an admin
// records that an MP sent a newsletter. It lands in newsletter_events, the same
// table the scoring already reads, so "sent this month" works unchanged.
// TODO: remove (or keep as a fallback) once automatic newsletter detection returns.

export type NewsletterEntry = {
  id: string;
  mpName: string;
  constituencyName: string;
  sentOn: string;
  subject: string | null;
  source: "manual" | "automatic";
};

export async function listNewsletterEntries(limit = 60): Promise<NewsletterEntry[]> {
  const rows = await sql<
    { id: string; mp_name: string; constituency_name: string; sent_on: string; subject: string | null; source: "manual" | "automatic" }[]
  >`
    select ne.id, r.name as mp_name, c.name as constituency_name, ne.received_at::date::text as sent_on, ne.subject, ne.source
    from newsletter_events ne
    join representatives r on r.id = ne.representative_id
    join constituencies c on c.id = r.constituency_id
    order by ne.received_at desc
    limit ${limit}
  `;
  return rows.map((r) => ({
    id: r.id,
    mpName: r.mp_name,
    constituencyName: r.constituency_name,
    sentOn: r.sent_on,
    subject: r.subject,
    source: r.source,
  }));
}

export async function addNewsletterEntry(params: {
  constituencyId: string;
  sentOn: string;
  subject: string | null;
}): Promise<boolean> {
  const [rep] = await sql<{ id: string }[]>`
    select id from representatives where constituency_id = ${params.constituencyId} and ended_at is null
  `;
  if (!rep) return false;
  await sql`
    insert into newsletter_events (representative_id, received_at, subject, sender, external_message_id, source)
    values (${rep.id}, ${`${params.sentOn}T12:00:00Z`}, ${params.subject}, 'Reported by hand', ${`manual-${randomUUID()}`}, 'manual')
  `;
  return true;
}

/** Only hand-reported entries can be removed; automatic ones are left alone. */
export async function deleteManualNewsletterEntry(id: string): Promise<void> {
  await sql`delete from newsletter_events where id = ${id} and source = 'manual'`;
}
