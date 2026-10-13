import { listConstituencies } from "@/lib/db";
import SubscriberForm from "../SubscriberForm";
import { submitSubscriberCountAction } from "../actions";

// Fetches the constituency list live — must render per-request.
export const dynamic = "force-dynamic";

function currentMonthStart(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export default async function NewSubscriberCountPage({ searchParams }: PageProps<"/admin/subscribers/new">) {
  const { submitted } = await searchParams;
  const constituencies = await listConstituencies();

  return (
    <div className="space-y-6">
      {submitted && (
        <p className="max-w-md rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          Thanks, that&apos;s been sent for approval.
        </p>
      )}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Log subscriber count for a month</h1>
        <p className="mt-2 max-w-md text-black/70 dark:text-white/70">
          Enter the total email subscriber list size for one constituency, for the month you
          choose. Sent for approval before it counts.
        </p>
      </div>
      <SubscriberForm
        action={submitSubscriberCountAction}
        constituencies={constituencies}
        lockKey={false}
        defaultMonthStart={currentMonthStart()}
      />
    </div>
  );
}
