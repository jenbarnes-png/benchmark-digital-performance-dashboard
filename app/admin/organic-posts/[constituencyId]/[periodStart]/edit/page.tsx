import { notFound } from "next/navigation";
import { listConstituencies } from "@/lib/db";
import { getOrganicPostEntry } from "@/lib/organicPosts";
import OrganicPostForm from "../../../OrganicPostForm";
import { saveOrganicPostsAction } from "../../../actions";

export default async function EditOrganicPostPage({
  params,
}: PageProps<"/admin/organic-posts/[constituencyId]/[periodStart]/edit">) {
  const { constituencyId, periodStart } = await params;

  const [constituencies, entry] = await Promise.all([
    listConstituencies(),
    getOrganicPostEntry(constituencyId, periodStart),
  ]);

  if (!entry) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit posts — {entry.constituencyName}</h1>
      </div>
      <OrganicPostForm
        action={saveOrganicPostsAction}
        constituencies={constituencies}
        initialValues={entry}
        lockKey={true}
        defaultPeriodStart={periodStart}
      />
    </div>
  );
}
