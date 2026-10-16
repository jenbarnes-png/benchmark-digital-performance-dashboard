import { listConstituencies } from "@/lib/db";
import AmplifierForm from "../AmplifierForm";
import { submitAmplifierAction } from "../actions";

// Fetches the constituency list live: must render per-request.
export const dynamic = "force-dynamic";

function mondayOnOrBefore(date: Date): string {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + (d.getUTCDay() === 0 ? -6 : 1) - d.getUTCDay());
  return d.toISOString().slice(0, 10);
}

export default async function NewAmplifierReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
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
        <h1 className="text-2xl font-semibold tracking-tight">Report an amplifier group</h1>
        <p className="mt-2 max-w-md text-black/70 dark:text-white/70">
          Tell us about your amplifier group chat for the week, with a screenshot. 2 points for an
          established group of 3 or more people, plus 1 point for each week it&apos;s active.
          Sent for approval before it counts.
        </p>
      </div>
      <AmplifierForm action={submitAmplifierAction} constituencies={constituencies} defaultPeriodStart={mondayOnOrBefore(new Date())} />
    </div>
  );
}
