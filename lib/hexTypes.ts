// Split out from lib/hexmapData.ts so client components (HexMap,
// HexMapToggle) can import just these types without pulling in that
// file's `sql`/postgres import — which needs Node built-ins Turbopack
// can't bundle for the browser.

export type HexTier = "active" | "recent" | "stale" | "not_tracked";

export type ConstituencyHexStatus = {
  constituencyId: string;
  name: string;
  tier: HexTier;
  /** Tooltip text, e.g. "2 active ads" or "3 / 7 points". */
  detail: string;
};
