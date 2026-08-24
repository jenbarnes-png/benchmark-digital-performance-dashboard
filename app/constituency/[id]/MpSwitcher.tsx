"use client";

import { useRouter } from "next/navigation";
import type { Constituency } from "@/lib/db";

export default function MpSwitcher({
  constituencies,
  currentId,
}: {
  constituencies: Constituency[];
  currentId: string;
}) {
  const router = useRouter();

  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-black/60 dark:text-white/60">Switch MP</span>
      <select
        value={currentId}
        onChange={(e) => router.push(`/constituency/${e.target.value}`)}
        className="min-w-56 rounded-md border border-black/15 bg-transparent px-3 py-1.5 text-sm dark:border-white/20"
      >
        {constituencies.map((c) => (
          <option key={c.id} value={c.id}>
            {c.mp_or_candidate_name ? `${c.mp_or_candidate_name} · ${c.name}` : c.name}
          </option>
        ))}
      </select>
    </label>
  );
}
