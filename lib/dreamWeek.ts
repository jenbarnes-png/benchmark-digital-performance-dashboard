// The Dream Week checklist (see /scoring) as nine red/amber/green
// cards, 0-2 points each — deliberately separate from the Overall
// score/Rankings math, which stays exactly as it was (2 ad + 5 TikTok
// points). This is a weekly "how are we doing against the benchmark"
// view for a single constituency, not a competitive ranking.

export type DreamWeekTier = "green" | "amber" | "red" | "unknown";

export type DreamWeekItem = {
  key: string;
  title: string;
  target: string;
  tier: DreamWeekTier;
  points: number; // 0, 1 or 2 — 0 whenever tier is "unknown" too
  detail: string;
};

/** 0 counts as red, anything short of the green threshold is amber (partial credit), meeting or beating it is green. */
export function tierForCount(count: number, greenAt: number): { tier: DreamWeekTier; points: number } {
  if (count <= 0) return { tier: "red", points: 0 };
  if (count < greenAt) return { tier: "amber", points: 1 };
  return { tier: "green", points: 2 };
}

/** A card for a metric we can't measure yet — shown so the full nine-item checklist stays visible, honestly marked rather than guessed at. */
export function untrackedItem(key: string, title: string, target: string, reason: string): DreamWeekItem {
  return { key, title, target, tier: "unknown", points: 0, detail: reason };
}
