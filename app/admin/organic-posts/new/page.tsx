import { listConstituencies } from "@/lib/db";
import OrganicPostForm from "../OrganicPostForm";
import { saveOrganicPostsAction } from "../actions";

function mondayOnOrBefore(date: Date): string {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

export default async function NewOrganicPostPage() {
  const constituencies = await listConstituencies();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Log posts for a week</h1>
        <p className="mt-2 max-w-md text-black/70 dark:text-white/70">
          Enter the number of Facebook and Instagram posts for one constituency, for the
          Monday-starting week you choose.
        </p>
      </div>
      <OrganicPostForm
        action={saveOrganicPostsAction}
        constituencies={constituencies}
        lockKey={false}
        defaultPeriodStart={mondayOnOrBefore(new Date())}
      />
    </div>
  );
}
