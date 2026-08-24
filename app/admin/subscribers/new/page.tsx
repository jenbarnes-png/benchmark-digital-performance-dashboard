import { listConstituencies } from "@/lib/db";
import SubscriberForm from "../SubscriberForm";
import { submitSubscriberCountAction } from "../actions";

// Fetches the constituency list live — must render per-request.
export const dynamic = "force-dynamic";

function currentMonthStart(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export default async function NewSubscriberCountPage() {
  const constituencies = await listConstituencies();

  return (
    <div className="space-y-6">
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
