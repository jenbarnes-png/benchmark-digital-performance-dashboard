import { listConstituencies } from "@/lib/db";
import FacebookGroupForm from "../FacebookGroupForm";
import { submitFacebookGroupAction } from "../actions";

// Fetches the constituency list live — must render per-request, not be
// frozen at build time (a new constituency added after deploy would
// otherwise never show up in this dropdown until the next deploy).
export const dynamic = "force-dynamic";

function mondayOnOrBefore(date: Date): string {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

export default async function NewFacebookGroupPage() {
  const constituencies = await listConstituencies();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Log Facebook Group posts for a week</h1>
        <p className="mt-2 max-w-md text-black/70 dark:text-white/70">
          Enter the number of Facebook Group posts for one constituency, for the Monday-starting
          week you choose. Sent for approval before it counts.
        </p>
      </div>
      <FacebookGroupForm
        action={submitFacebookGroupAction}
        constituencies={constituencies}
        lockKey={false}
        defaultPeriodStart={mondayOnOrBefore(new Date())}
      />
    </div>
  );
}
