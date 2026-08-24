import { notFound } from "next/navigation";
import { listConstituencies } from "@/lib/db";
import { getFacebookGroupEntry } from "@/lib/facebookGroupActivity";
import FacebookGroupForm from "../../../FacebookGroupForm";
import { submitFacebookGroupAction } from "../../../actions";

export default async function EditFacebookGroupPage({
  params,
}: PageProps<"/admin/facebook-group/[constituencyId]/[periodStart]/edit">) {
  const { constituencyId, periodStart } = await params;

  const [constituencies, entry] = await Promise.all([
    listConstituencies(),
    getFacebookGroupEntry(constituencyId, periodStart),
  ]);

  if (!entry) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit posts — {entry.constituencyName}</h1>
        <p className="mt-2 max-w-md text-black/70 dark:text-white/70">
          Saving changes re-sends this for approval, even if it was already approved.
        </p>
      </div>
      <FacebookGroupForm
        action={submitFacebookGroupAction}
        constituencies={constituencies}
        initialValues={entry}
        lockKey={true}
        defaultPeriodStart={periodStart}
      />
    </div>
  );
}
