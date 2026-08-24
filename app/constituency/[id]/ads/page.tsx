import { notFound } from "next/navigation";
import Link from "next/link";
import { getConstituency } from "@/lib/db";
import { getAdsForConstituency } from "@/lib/ads";
import AdsList from "../AdsList";
import { RECENT_WINDOW_DAYS } from "@/lib/adRecency";

export default async function ConstituencyAdsPage({
  params,
}: PageProps<"/constituency/[id]/ads">) {
  const { id } = await params;

  const [constituency, ads] = await Promise.all([getConstituency(id), getAdsForConstituency(id)]);
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
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">All ads — {constituency.name}</h1>
        <p className="mt-1 text-black/70 dark:text-white/70">
          From Meta&apos;s public Ad Library, active in the last {RECENT_WINDOW_DAYS} days, most recent first.
        </p>
      </div>
      <AdsList ads={ads} />
    </div>
  );
}
