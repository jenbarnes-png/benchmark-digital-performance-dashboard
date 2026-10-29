import { NextResponse } from "next/server";
import { beaconAuthEnabled, getBeaconUser } from "@/lib/beaconAuth";
import { canUseAdmin } from "@/lib/beaconSession";
import { getRankingsForRange } from "@/lib/rankings";
import { rankingsFileName, rankingsToCsv } from "@/lib/rankingsExport";

// Downloads the Rankings as a CSV for a chosen range of weeks and (optionally) one region.
// Example: /rankings/export?from=2026-10-05&to=2026-10-26&region=Wales
export const dynamic = "force-dynamic";

const plain = (message: string, status: number) =>
  new NextResponse(message, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });

export async function GET(request: Request) {
  // Route handlers aren't covered by the page layout's sign-in check, so check the session here too.
  // Only staff and admin accounts can download (the proxy checks this too).
  if (beaconAuthEnabled()) {
    const user = await getBeaconUser();
    if (!user) return plain("Please sign in to Project Beacon to download this.", 401);
    if (!canUseAdmin(user.role)) return plain("The Rankings download is only available to Project Beacon staff and admins.", 403);
  }

  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  const region = url.searchParams.get("region") || undefined;

  const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);
  if (!isDate(from) || !isDate(to)) {
    return plain("Choose a start week and an end week (dates like 2026-10-05), then try again.", 400);
  }

  const { weeks, regions } = await getRankingsForRange({ from, to, region });
  if (region && !regions.includes(region)) {
    return plain(`"${region}" isn't a region we track. Choose one from the list on the Rankings page.`, 400);
  }
  if (weeks.length === 0) {
    return plain("There are no weeks of data in that range. Choose weeks that appear in the Rankings week list.", 404);
  }

  const first = weeks[0].period.start;
  const last = weeks[weeks.length - 1].period.start;
  return new NextResponse(rankingsToCsv(weeks), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${rankingsFileName(first, last, region)}"`,
      "Cache-Control": "no-store",
    },
  });
}
