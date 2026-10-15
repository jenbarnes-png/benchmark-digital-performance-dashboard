// First Monday the dashboard shows. Everything before this came from the old
// data supplier and was unreliable, so those weeks are hidden. To show earlier
// weeks (e.g. once Crete backfills further), set TRACKING_START=YYYY-MM-DD
// (a Monday) in .env.local / Vercel instead of editing code.
export const TRACKING_START: string = /^\d{4}-\d{2}-\d{2}$/.test(process.env.TRACKING_START ?? "")
  ? (process.env.TRACKING_START as string)
  : "2026-10-05";
