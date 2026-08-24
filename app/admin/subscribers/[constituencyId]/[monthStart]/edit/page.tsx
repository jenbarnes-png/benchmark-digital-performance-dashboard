import { notFound } from "next/navigation";
import { listConstituencies } from "@/lib/db";
import { getSubscriberCountEntry } from "@/lib/subscriberCounts";
import SubscriberForm from "../../../SubscriberForm";
import { submitSubscriberCountAction } from "../../../actions";

export default async function EditSubscriberCountPage({
  params,
}: PageProps<"/admin/subscribers/[constituencyId]/[monthStart]/edit">) {
  const { constituencyId, monthStart } = await params;

  const [constituencies, entry] = await Promise.all([
    listConstituencies(),
    getSubscriberCountEntry(constituencyId, monthStart),
  ]);

  if (!entry) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit subscriber count — {entry.constituencyName}</h1>
        <p className="mt-2 max-w-md text-black/70 dark:text-white/70">
          Saving changes re-sends this for approval, even if it was already approved.
        </p>
      </div>
      <SubscriberForm
        action={submitSubscriberCountAction}
        constituencies={constituencies}
        initialValues={entry}
        lockKey={true}
        defaultMonthStart={monthStart}
      />
    </div>
  );
}
