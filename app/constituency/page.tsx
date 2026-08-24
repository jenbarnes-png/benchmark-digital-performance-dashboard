import { redirect } from "next/navigation";
import { getRankings } from "@/lib/rankings";

// Redirects to the current #1 ranked seat — must be computed live, not
// frozen at build time.
export const dynamic = "force-dynamic";

export default async function ConstituencyIndexPage() {
  const { rows } = await getRankings({});
  const top = rows.find((r) => r.rank === 1) ?? rows[0];
  if (!top) {
    return <p className="text-black/60 dark:text-white/60">No constituencies yet.</p>;
  }
  redirect(`/constituency/${top.constituency.id}`);
}
