import type { TiktokVideoItem } from "@/lib/tiktokVideos";
import TiktokEmbed from "./TiktokEmbed";

function formatCount(n: number | null): string {
  if (n === null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

export default function TiktokVideoCard({
  video,
  showMp = true,
}: {
  video: TiktokVideoItem;
  /** Hide the MP/constituency byline when already shown by the surrounding page (e.g. a single-MP detail page). */
  showMp?: boolean;
}) {
  return (
    <div className="rounded-lg border border-black/10 dark:border-white/15">
      <TiktokEmbed url={video.videoUrl} />
      <div className="flex items-center justify-between gap-2 border-t border-black/10 px-3 py-2 text-xs text-black/60 dark:border-white/15 dark:text-white/60">
        {showMp ? (
          <span className="truncate font-medium">
            {video.mpName} <span className="font-normal text-black/40 dark:text-white/40">· {video.constituencyName}</span>
          </span>
        ) : (
          <span />
        )}
        <span className="flex shrink-0 gap-2 tabular-nums">
          <span title="Views">👁 {formatCount(video.viewCount)}</span>
          <span title="Likes">♥ {formatCount(video.likeCount)}</span>
        </span>
      </div>
    </div>
  );
}
