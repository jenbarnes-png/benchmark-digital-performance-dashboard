import type { ChannelPostItem } from "@/lib/channelActivity";
import FacebookEmbed from "./FacebookEmbed";
import InstagramEmbed from "./InstagramEmbed";

function formatCount(n: number | null): string {
  if (n === null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

export default function ChannelPostCard({
  post,
  showMp = true,
}: {
  post: ChannelPostItem;
  showMp?: boolean;
}) {
  return (
    <div className="rounded-lg border border-black/10 dark:border-white/15">
      {post.platform === "facebook" ? <FacebookEmbed url={post.url} /> : <InstagramEmbed url={post.url} />}
      <div className="flex items-center justify-between gap-2 border-t border-black/10 px-3 py-2 text-xs text-black/60 dark:border-white/15 dark:text-white/60">
        {showMp ? (
          <span className="truncate font-medium">
            {post.mpName} <span className="font-normal text-black/40 dark:text-white/40">· {post.constituencyName}</span>
          </span>
        ) : (
          <span className="font-medium capitalize">{post.platform}</span>
        )}
        <span className="shrink-0 tabular-nums" title="Reach">
          👁 {formatCount(post.reach)}
        </span>
      </div>
    </div>
  );
}
