import { notFound } from "next/navigation";
import Link from "next/link";
import { getAmplifierEntryByToken } from "@/lib/amplifierGroups";
import { AMPLIFIER_MIN_MEMBERS } from "@/lib/amplifierScoring";
import { formatPeriodLabel } from "@/lib/format";
import { approveAmplifierAction, rejectAmplifierAction } from "../../actions";

// Approving or rejecting is a real change, so this page never does it on load (an email client or
// link scanner might pre-fetch it). It only shows the report; the change happens when someone
// clicks Approve or Reject, which sends a form.
export const dynamic = "force-dynamic";

const inputClass = "rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20";

export default async function ApproveAmplifierPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const entry = await getAmplifierEntryByToken(token);
  if (!entry) notFound();

  const approve = approveAmplifierAction.bind(null, token);
  const reject = rejectAmplifierAction.bind(null, token);
  const enough = (entry.memberCount ?? 0) >= AMPLIFIER_MIN_MEMBERS;

  return (
    <div className="max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{entry.constituencyName}</h1>
        <p className="mt-2 text-black/70 dark:text-white/70">
          Amplifier group for {formatPeriodLabel({ start: entry.periodStart, end: entry.periodEnd })}.
        </p>
        <ul className="mt-3 space-y-1 text-sm">
          <li>
            <span className="font-medium">{entry.memberCount ?? "?"} members</span>{" "}
            <span className="text-black/50 dark:text-white/50">
              ({enough ? `meets the ${AMPLIFIER_MIN_MEMBERS}+ needed` : `below the ${AMPLIFIER_MIN_MEMBERS} needed`})
            </span>
          </li>
          <li><span className="font-medium">{entry.postCount ?? "?"} posts</span> this week</li>
        </ul>
        {entry.notes && <p className="mt-3 rounded-md bg-black/5 p-3 text-sm dark:bg-white/10">{entry.notes}</p>}
        {entry.hasScreenshot && (
          // eslint-disable-next-line @next/next/no-img-element -- served from our own dynamic DB-backed route, not a static asset next/image can optimize
          <img
            src={`/admin/amplifiers/screenshot/${entry.id}`}
            alt="Screenshot of the amplifier group"
            className="mt-3 max-h-[28rem] w-auto rounded-lg border border-black/10 dark:border-white/15"
          />
        )}
        <p className="mt-2 text-xs text-black/50 dark:text-white/50">
          Check the screenshot shows the member count or list and this week&apos;s posts going in.
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
          <form action={approve} className="flex items-end gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Approving as</span>
              <input name="approvedBy" type="text" required placeholder="Your name" className={inputClass} />
            </label>
            <button type="submit" className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90">
              Approve
            </button>
          </form>
          <form action={reject} className="flex items-end gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Rejecting as</span>
              <input name="approvedBy" type="text" required placeholder="Your name" className={inputClass} />
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

      <Link href="/admin/amplifiers" className="text-sm font-medium text-black/70 hover:underline dark:text-white/70">
        ← Back to amplifier groups
      </Link>
    </div>
  );
}
