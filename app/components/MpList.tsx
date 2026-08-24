import Link from "next/link";
import type { Constituency } from "@/lib/db";

export default function MpList({ constituencies }: { constituencies: Constituency[] }) {
  return (
    <div className="rounded-lg border border-black/10 dark:border-white/15">
      <div className="max-h-[560px] divide-y divide-black/5 overflow-y-auto dark:divide-white/10">
        {constituencies.map((c) => (
          <Link
            key={c.id}
            href={`/constituency/${c.id}`}
            className="block px-4 py-2.5 text-sm hover:bg-black/[.02] dark:hover:bg-white/[.04]"
          >
            <span className="font-medium">{c.mp_or_candidate_name || c.name}</span>
            <span className="block text-xs text-black/50 dark:text-white/50">{c.name}</span>
          </Link>
        ))}
        {constituencies.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-black/50 dark:text-white/50">
            No constituencies tracked yet.
          </p>
        )}
      </div>
    </div>
  );
}
