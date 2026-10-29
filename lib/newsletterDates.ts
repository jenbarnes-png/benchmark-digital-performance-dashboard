// A newsletter is reported with just a date. It is stored as the START of that day (midnight UTC),
// not midday: the scoring ignores anything dated later than "now" (or later than the start of the
// week's last day, for past weeks), so a midday timestamp meant a newsletter logged on the morning
// it was sent, or sent on a Sunday, did not count.
export function sentOnToTimestamp(sentOn: string): string {
  return `${sentOn}T00:00:00Z`;
}
