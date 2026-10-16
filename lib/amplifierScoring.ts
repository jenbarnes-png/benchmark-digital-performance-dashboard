// Amplifier group scoring: up to 3 points a week.
//   2 points  the MP has an established group chat: the latest approved report
//             (this week or earlier) shows at least 3 members.
//   1 point   the group was active this week: an approved report for this week
//             shows at least 1 post going in.
// Reports are typed in by hand with a screenshot and approved before they count.
// A group that was established stays established until a later report says
// otherwise, so a quiet week costs only the "active" point.

export const AMPLIFIER_MIN_MEMBERS = 3;
export const AMPLIFIER_ESTABLISHED_POINTS = 2;
export const AMPLIFIER_ACTIVE_POINTS = 1;
export const AMPLIFIER_MAX_POINTS = AMPLIFIER_ESTABLISHED_POINTS + AMPLIFIER_ACTIVE_POINTS;

/** One approved weekly report. `periodStart` is the Monday, e.g. "2026-10-12". */
export type AmplifierReport = { periodStart: string; memberCount: number | null; postCount: number | null };

export type AmplifierStatus = {
  /** True when at least one approved report exists up to this week. */
  hasData: boolean;
  established: boolean;
  activeThisWeek: boolean;
  memberCount: number | null;
  points: number;
};

/** Works out the status for the week starting `weekStart`, from a constituency's approved reports. */
export function amplifierStatusForWeek(reports: AmplifierReport[] | undefined, weekStart: string): AmplifierStatus {
  const none: AmplifierStatus = { hasData: false, established: false, activeThisWeek: false, memberCount: null, points: 0 };
  if (!reports || reports.length === 0) return none;

  const upToThisWeek = reports.filter((r) => r.periodStart <= weekStart).sort((a, b) => a.periodStart.localeCompare(b.periodStart));
  if (upToThisWeek.length === 0) return none;

  const latest = upToThisWeek[upToThisWeek.length - 1];
  const thisWeek = upToThisWeek.find((r) => r.periodStart === weekStart);

  const established = (latest.memberCount ?? 0) >= AMPLIFIER_MIN_MEMBERS;
  const activeThisWeek = established && (thisWeek?.postCount ?? 0) >= 1;
  const points = (established ? AMPLIFIER_ESTABLISHED_POINTS : 0) + (activeThisWeek ? AMPLIFIER_ACTIVE_POINTS : 0);

  return { hasData: true, established, activeThisWeek, memberCount: latest.memberCount, points };
}

/** Same shape as the other points-based metrics: no approved report means 0 of these points, not excluded from the total. */
export function scoreForAmplifiers(params: { hasData: boolean; points: number }): {
  hasData: boolean;
  score: number | null;
  maxPoints: number;
} {
  const maxPoints = AMPLIFIER_MAX_POINTS;
  if (!params.hasData) return { hasData: false, score: null, maxPoints };
  return { hasData: true, score: (Math.min(params.points, maxPoints) / maxPoints) * 100, maxPoints };
}
