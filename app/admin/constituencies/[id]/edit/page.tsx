import { notFound } from "next/navigation";
import { getConstituency } from "@/lib/db";
import ConstituencyForm from "../../ConstituencyForm";
import { updateConstituencyAction } from "../../actions";

export default async function EditConstituencyPage({
  params,
}: PageProps<"/admin/constituencies/[id]/edit">) {
  const { id } = await params;
  const constituency = getConstituency(id);

  if (!constituency) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit constituency</h1>
        <p className="mt-2 max-w-md text-black/70 dark:text-white/70">
          Update details for {constituency.name}.
        </p>
      </div>
      <ConstituencyForm
        action={updateConstituencyAction.bind(null, id)}
        initialValues={constituency}
        submitLabel="Save changes"
      />
    </div>
  );
}
