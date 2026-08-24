import {
  getAdHexStatuses,
  getTiktokHexStatuses,
  getOverallHexStatuses,
  getFacebookHexStatuses,
  getInstagramHexStatuses,
  getGroupHexStatuses,
  getEmailHexStatuses,
} from "@/lib/hexmapData";
import { getTopTiktokVideosNational } from "@/lib/tiktokVideos";
import { getTopChannelPostsNational } from "@/lib/channelActivity";
import { getHexLayout } from "@/lib/hexmap";
import { listConstituencies } from "@/lib/db";
import HexMapToggle from "./components/HexMapToggle";
import TiktokVideoCard from "./components/TiktokVideoCard";
import ChannelPostCard from "./components/ChannelPostCard";
import MpList from "./components/MpList";

// Without this, Next prerenders the homepage once at build/deploy time
// and serves that frozen snapshot forever — the hex map and TikTok
// section would stop reflecting reality the moment data changes.
export const dynamic = "force-dynamic";

export default async function NationalDashboardPage() {
  const [
    adStatuses,
    tiktokStatuses,
    overallStatuses,
    facebookStatuses,
    instagramStatuses,
    groupStatuses,
    emailStatuses,
    topTiktokVideos,
    topChannelPosts,
    allConstituencies,
  ] = await Promise.all([
    getAdHexStatuses(),
    getTiktokHexStatuses(),
    getOverallHexStatuses(),
    getFacebookHexStatuses(),
    getInstagramHexStatuses(),
    getGroupHexStatuses(),
    getEmailHexStatuses(),
    getTopTiktokVideosNational(3),
    getTopChannelPostsNational(3),
    listConstituencies(),
  ]);
  const { positions, hexSize, viewBox } = getHexLayout();
  const trackedCount = adStatuses.size;
  const activeCount = Array.from(adStatuses.values()).filter((s) => s.tier === "active").length;
  const trackedConstituencies = allConstituencies
    .filter((c) => c.is_pilot)
    .sort((a, b) => (a.mp_or_candidate_name ?? a.name).localeCompare(b.mp_or_candidate_name ?? b.name));

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

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="min-w-0 flex-1">
          <HexMapToggle
            positions={positions}
            hexSize={hexSize}
            viewBox={viewBox}
            overall={Array.from(overallStatuses.entries())}
            ads={Array.from(adStatuses.entries())}
            tiktok={Array.from(tiktokStatuses.entries())}
            facebook={Array.from(facebookStatuses.entries())}
            instagram={Array.from(instagramStatuses.entries())}
            groups={Array.from(groupStatuses.entries())}
            email={Array.from(emailStatuses.entries())}
          />
        </div>
        <div className="lg:w-72 lg:shrink-0">
          <h2 className="mb-2 text-sm font-semibold text-black/60 dark:text-white/60">Tracked MPs</h2>
          <MpList constituencies={trackedConstituencies} />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold tracking-tight">Facebook &amp; Instagram shout-outs</h2>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          The 3 best-performing Facebook/Instagram posts across the pilot in the last 30 days, ranked by reach.
        </p>
        {topChannelPosts.length > 0 ? (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topChannelPosts.map((post) => (
              <ChannelPostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-lg border border-dashed border-black/20 p-6 text-center text-sm text-black/50 dark:border-white/20 dark:text-white/50">
            No Facebook/Instagram activity tracked in the last 30 days yet.
          </p>
        )}
      </div>

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
