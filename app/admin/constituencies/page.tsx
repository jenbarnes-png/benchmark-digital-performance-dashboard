import Link from "next/link";
import { listConstituencies } from "@/lib/db";
import { deleteConstituencyAction } from "./actions";

// DB-backed listing — must render per-request, not be frozen at build time.
export const dynamic = "force-dynamic";

export default async function ConstituenciesPage() {
  const constituencies = await listConstituencies();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Constituencies</h1>
          <p className="mt-2 max-w-2xl text-black/70 dark:text-white/70">
            {constituencies.length} constituenc{constituencies.length === 1 ? "y" : "ies"} on
            record. This is pilot sample data — it will be replaced with the full set of
            650 UK constituencies later.
          </p>
        </div>
        <Link
          href="/admin/constituencies/new"
          className="whitespace-nowrap rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
        >
          Add constituency
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/15">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 bg-black/[.02] dark:border-white/15 dark:bg-white/[.04]">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">MP / Candidate</th>
              <th className="px-4 py-3 font-medium">Region / Nation</th>
              <th className="px-4 py-3 font-medium">Pilot</th>
              <th className="px-4 py-3 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {constituencies.map((c) => (
              <tr key={c.id} className="border-b border-black/5 last:border-0 dark:border-white/10">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3 text-black/70 dark:text-white/70">
                  {c.mp_or_candidate_name || "—"}
                </td>
                <td className="px-4 py-3 text-black/70 dark:text-white/70">{c.region}</td>
                <td className="px-4 py-3">
                  {c.is_pilot ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                      Pilot
                    </span>
                  ) : (
                    <span className="text-black/40 dark:text-white/40">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-3">
                    <Link
                      href={`/admin/constituencies/${c.id}/edit`}
                      className="font-medium text-black/70 hover:text-black hover:underline dark:text-white/70 dark:hover:text-white"
                    >
                      Edit
                    </Link>
                    <form action={deleteConstituencyAction.bind(null, c.id)}>
                      <button
                        type="submit"
                        className="font-medium text-red-700 hover:underline dark:text-red-400"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {constituencies.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-black/50 dark:text-white/50">
                  No constituencies yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
