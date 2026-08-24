import { notFound } from "next/navigation";
import Link from "next/link";
import { getConstituency, getCurrentSocialAccounts } from "@/lib/db";
import { getTiktokVideosForConstituency } from "@/lib/tiktokVideos";
import { RECENT_WINDOW_DAYS } from "@/lib/adRecency";
import TiktokVideoCard from "@/app/components/TiktokVideoCard";

export default async function ConstituencyTiktokPage({
  params,
}: PageProps<"/constituency/[id]/tiktok">) {
  const { id } = await params;

  const [constituency, socialAccounts, videos] = await Promise.all([
    getConstituency(id),
    getCurrentSocialAccounts(id),
    getTiktokVideosForConstituency(id, 50),
  ]);
  if (!constituency) notFound();
  const tiktokAccount = socialAccounts.find((a) => a.platform === "tiktok");

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/constituency/${id}`}
          className="text-sm font-medium text-black/60 hover:underline dark:text-white/60"
        >
          ← Back to {constituency.name}
        </Link>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">All TikToks — {constituency.name}</h1>
          {tiktokAccount?.follower_count !== null && tiktokAccount?.follower_count !== undefined && (
            <span className="text-sm text-black/60 dark:text-white/60">
              {tiktokAccount.follower_count.toLocaleString()} followers
            </span>
          )}
        </div>
        <p className="mt-1 text-black/70 dark:text-white/70">
          Top videos in the last {RECENT_WINDOW_DAYS} days, ranked by views.
        </p>
      </div>
      {videos.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <TiktokVideoCard key={video.id} video={video} showMp={false} />
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-black/20 p-6 text-center text-sm text-black/50 dark:border-white/20 dark:text-white/50">
          No videos posted in the last {RECENT_WINDOW_DAYS} days.
        </p>
      )}
    </div>
  );
}
