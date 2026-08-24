import { notFound } from "next/navigation";
import Link from "next/link";
import { getConstituency } from "@/lib/db";
import { getChannelPostsForConstituency } from "@/lib/channelActivity";
import ChannelPostCard from "@/app/components/ChannelPostCard";

export default async function ConstituencyPostsPage({
  params,
}: PageProps<"/constituency/[id]/posts">) {
  const { id } = await params;

  const [constituency, posts] = await Promise.all([
    getConstituency(id),
    getChannelPostsForConstituency(id, 50),
  ]);
  if (!constituency) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/constituency/${id}`}
          className="text-sm font-medium text-black/60 hover:underline dark:text-white/60"
        >
          ← Back to {constituency.name}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          All Facebook &amp; Instagram posts — {constituency.name}
        </h1>
        <p className="mt-1 text-black/70 dark:text-white/70">
          Top posts in the last 30 days, ranked by reach.
        </p>
      </div>
      {posts.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <ChannelPostCard key={post.id} post={post} showMp={false} />
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-black/20 p-6 text-center text-sm text-black/50 dark:border-white/20 dark:text-white/50">
          No posts in the last 30 days.
        </p>
      )}
    </div>
  );
}
