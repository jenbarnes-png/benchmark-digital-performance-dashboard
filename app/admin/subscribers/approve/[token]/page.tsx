import { notFound } from "next/navigation";
import Link from "next/link";
import { listSubscriberCountEntries } from "@/lib/subscriberCounts";
import { formatMonthLabel } from "@/lib/format";
import { approveSubscriberEntryAction, rejectSubscriberEntryAction } from "../../actions";

const APPROVERS = ["Jen Barnes", "Alex Creighton"];

// Same GET-safe confirmation pattern as the Facebook Group approve page
// — never approves/rejects on load, only on an explicit button click.
export default async function ApproveSubscriberCountPage({
  params,
}: PageProps<"/admin/subscribers/approve/[token]">) {
  const { token } = await params;

  const entries = await listSubscriberCountEntries();
  const entry = entries.find((e) => e.approvalToken === token);
  if (!entry) notFound();

  const approveAction = approveSubscriberEntryAction.bind(null, token);
  const rejectAction = rejectSubscriberEntryAction.bind(null, token);

  return (
    <div className="max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{entry.constituencyName}</h1>
        <p className="mt-2 text-black/70 dark:text-white/70">
          {(entry.subscriberCount ?? 0).toLocaleString()} email subscribers reported for{" "}
          {formatMonthLabel(entry.monthStart)}.
        </p>
      </div>

      {entry.status !== "pending" ? (
        <p className="rounded-lg border border-black/10 p-4 text-sm dark:border-white/15">
          Already <span className="font-medium">{entry.status}</span>
          {entry.approvedBy ? ` by ${entry.approvedBy}` : ""}
          {entry.approvedAt ? ` on ${new Date(entry.approvedAt).toLocaleString("en-GB")}` : ""}.
        </p>
      ) : (
        <div className="space-y-4 rounded-lg border border-black/10 p-5 dark:border-white/15">
          <form action={approveAction} className="flex items-end gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Approving as</span>
              <select
                name="approvedBy"
                defaultValue={APPROVERS[0]}
                className="rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20"
              >
                {APPROVERS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Approve
            </button>
          </form>
          <form action={rejectAction} className="flex items-end gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Rejecting as</span>
              <select
                name="approvedBy"
                defaultValue={APPROVERS[0]}
                className="rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20"
              >
                {APPROVERS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              Reject
            </button>
          </form>
        </div>
      )}

      <Link href="/admin/subscribers" className="text-sm font-medium text-black/70 hover:underline dark:text-white/70">
        ← Back to subscriber counts
      </Link>
    </div>
  );
}
