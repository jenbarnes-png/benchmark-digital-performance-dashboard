import Link from "next/link";
import { listFacebookGroupEntries } from "@/lib/facebookGroupActivity";
import { formatPeriodLabel } from "@/lib/format";
import { deleteFacebookGroupAction } from "./actions";

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

// DB-backed pending-approval queue — must render per-request.
export const dynamic = "force-dynamic";

export default async function FacebookGroupPage() {
  const entries = await listFacebookGroupEntries();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Facebook Group manual reporting</h1>
          <p className="mt-2 max-w-2xl text-black/70 dark:text-white/70">
            Weekly Facebook Group post counts, logged by hand since there&apos;s no automatic feed
            for private groups. Each submission needs approval from Jen or Alex — by email link or
            below — before it counts on the tracker.
          </p>
        </div>
        <Link
          href="/admin/facebook-group/new"
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
              <th className="px-4 py-3 font-medium">Posts</th>
              <th className="px-4 py-3 font-medium">Evidence</th>
              <th className="px-4 py-3 font-medium">Status</th>
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
                  {e.postCount ?? <span className="text-black/40 dark:text-white/40">—</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {e.postUrl && (
                      <a
                        href={e.postUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="View the post"
                        className="text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
                      >
                        🔗
                      </a>
                    )}
                    {e.hasScreenshot && (
                      <Link
                        href={`/admin/facebook-group/screenshot/${e.id}`}
                        target="_blank"
                        title="View screenshot"
                        className="text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
                      >
                        🖼️
                      </Link>
                    )}
                    {!e.postUrl && !e.hasScreenshot && <span className="text-black/30 dark:text-white/30">—</span>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[e.status]}`}>
                    {e.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-3">
                    {e.status === "pending" && (
                      <Link
                        href={`/admin/facebook-group/approve/${e.approvalToken}`}
                        className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                      >
                        Review
                      </Link>
                    )}
                    <Link
                      href={`/admin/facebook-group/${e.constituencyId}/${e.periodStart}/edit`}
                      className="font-medium text-black/70 hover:text-black hover:underline dark:text-white/70 dark:hover:text-white"
                    >
                      Edit
                    </Link>
                    <form action={deleteFacebookGroupAction.bind(null, e.constituencyId, e.periodStart)}>
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
                <td colSpan={6} className="px-4 py-8 text-center text-black/50 dark:text-white/50">
                  No Facebook Group posting data logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
