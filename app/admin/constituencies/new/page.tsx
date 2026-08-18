import ConstituencyForm from "../ConstituencyForm";
import { createConstituencyAction } from "../actions";

export default function NewConstituencyPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Add constituency</h1>
        <p className="mt-2 max-w-md text-black/70 dark:text-white/70">
          Add a new constituency to the pilot dataset.
        </p>
      </div>
      <ConstituencyForm action={createConstituencyAction} submitLabel="Add constituency" />
    </div>
  );
}
