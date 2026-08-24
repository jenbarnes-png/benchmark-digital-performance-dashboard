import Link from "next/link";
import { listOrganicPostEntries } from "@/lib/organicPosts";
import { formatPeriodLabel } from "@/lib/format";
import { deleteOrganicPostsAction } from "./actions";

export default async function OrganicPostsPage() {
  const entries = await listOrganicPostEntries();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Organic posting — Facebook &amp; Instagram</h1>
          <p className="mt-2 max-w-2xl text-black/70 dark:text-white/70">
            Weekly post counts, logged by hand since there&apos;s no automatic feed for other
            people&apos;s Pages. Feeds straight into each constituency&apos;s platform breakdown.
          </p>
        </div>
        <Link
          href="/admin/organic-posts/new"
          className="whitespace-nowrap rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
        >
          Log posts for a week
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/15">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 bg-black/[.02] dark:border-white/15 dark:bg-white/[.04]">
            <tr>
              <th className="px-4 py-3 font-medium">Constituency</th>
              <th className="px-4 py-3 font-medium">Week</th>
              <th className="px-4 py-3 font-medium">Facebook</th>
              <th className="px-4 py-3 font-medium">Instagram</th>
              <th className="px-4 py-3 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr
                key={`${e.constituencyId}|${e.periodStart}`}
                className="border-b border-black/5 last:border-0 dark:border-white/10"
              >
                <td className="px-4 py-3 font-medium">{e.constituencyName}</td>
                <td className="px-4 py-3 text-black/70 dark:text-white/70">
                  {formatPeriodLabel({ start: e.periodStart, end: e.periodEnd })}
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {e.counts.Facebook.hasData ? (
                    e.counts.Facebook.postCount
                  ) : (
                    <span className="text-black/40 dark:text-white/40">—</span>
                  )}
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {e.counts.Instagram.hasData ? (
                    e.counts.Instagram.postCount
                  ) : (
                    <span className="text-black/40 dark:text-white/40">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-3">
                    <Link
                      href={`/admin/organic-posts/${e.constituencyId}/${e.periodStart}/edit`}
                      className="font-medium text-black/70 hover:text-black hover:underline dark:text-white/70 dark:hover:text-white"
                    >
                      Edit
                    </Link>
                    <form action={deleteOrganicPostsAction.bind(null, e.constituencyId, e.periodStart)}>
                      <button type="submit" className="font-medium text-red-700 hover:underline dark:text-red-400">
                        Delete
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-black/50 dark:text-white/50">
                  No organic posting data logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
