import { getConstituencyAdStatuses } from "@/lib/hexmapData";
import { getTopTiktokVideosNational } from "@/lib/tiktokVideos";
import { RECENT_WINDOW_DAYS } from "@/lib/adRecency";
import HexMap from "./components/HexMap";
import TiktokVideoCard from "./components/TiktokVideoCard";

export default async function NationalDashboardPage() {
  const [statuses, topTiktokVideos] = await Promise.all([
    getConstituencyAdStatuses(),
    getTopTiktokVideosNational(6),
  ]);
  const trackedCount = statuses.size;
  const activeCount = Array.from(statuses.values()).filter((s) => s.status === "active").length;

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

      <HexMap statuses={statuses} />

      <div>
        <h2 className="text-lg font-semibold tracking-tight">Top TikTok activity</h2>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          Best-performing video from each pilot MP in the last {RECENT_WINDOW_DAYS} days, ranked by views.
        </p>
        {topTiktokVideos.length > 0 ? (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topTiktokVideos.map((video) => (
              <TiktokVideoCard key={video.id} video={video} />
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-lg border border-dashed border-black/20 p-6 text-center text-sm text-black/50 dark:border-white/20 dark:text-white/50">
            No TikTok activity tracked in the last {RECENT_WINDOW_DAYS} days yet.
          </p>
        )}
      </div>
    </div>
  );
}
