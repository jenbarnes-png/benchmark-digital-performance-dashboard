import { getAdHexStatuses, getTiktokHexStatuses, getOverallHexStatuses } from "@/lib/hexmapData";
import { getTopTiktokVideosNational } from "@/lib/tiktokVideos";
import { getHexLayout } from "@/lib/hexmap";
import HexMapToggle from "./components/HexMapToggle";
import TiktokVideoCard from "./components/TiktokVideoCard";

// Without this, Next prerenders the homepage once at build/deploy time
// and serves that frozen snapshot forever — the hex map and TikTok
// section would stop reflecting reality the moment data changes.
export const dynamic = "force-dynamic";

export default async function NationalDashboardPage() {
  const [adStatuses, tiktokStatuses, overallStatuses, topTiktokVideos] = await Promise.all([
    getAdHexStatuses(),
    getTiktokHexStatuses(),
    getOverallHexStatuses(),
    getTopTiktokVideosNational(3),
  ]);
  const { positions, hexSize, viewBox } = getHexLayout();
  const trackedCount = adStatuses.size;
  const activeCount = Array.from(adStatuses.values()).filter((s) => s.tier === "active").length;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">National Dashboard</h1>
        <p className="mt-2 max-w-2xl text-black/70 dark:text-white/70">
          All 650 UK constituencies. {trackedCount} currently tracked
          {activeCount > 0 ? `, ${activeCount} with ads running right now` : ""}. Click any seat
          for its full detail.
        </p>
      </div>

      <HexMapToggle
        positions={positions}
        hexSize={hexSize}
        viewBox={viewBox}
        overall={Array.from(overallStatuses.entries())}
        ads={Array.from(adStatuses.entries())}
        tiktok={Array.from(tiktokStatuses.entries())}
      />

      <div>
        <h2 className="text-lg font-semibold tracking-tight">TikTok shout-outs</h2>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          The 3 best-performing TikTok videos across the pilot in the last 30 days, ranked by views.
        </p>
        {topTiktokVideos.length > 0 ? (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topTiktokVideos.map((video) => (
              <TiktokVideoCard key={video.id} video={video} />
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-lg border border-dashed border-black/20 p-6 text-center text-sm text-black/50 dark:border-white/20 dark:text-white/50">
            No TikTok activity tracked in the last 30 days yet.
          </p>
        )}
      </div>
    </div>
  );
}
