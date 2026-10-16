"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { Constituency } from "@/lib/db";
import type { FormState } from "./actions";

const inputClass = "mt-1 w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20";

export default function AmplifierForm({
  action,
  constituencies,
  defaultPeriodStart,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  constituencies: Constituency[];
  defaultPeriodStart: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, null);

  return (
    <form action={formAction} className="max-w-md space-y-5">
      <div>
        <label htmlFor="constituencyId" className="block text-sm font-medium">Constituency</label>
        <select id="constituencyId" name="constituencyId" required defaultValue="" className={inputClass}>
          <option value="" disabled>Choose a constituency…</option>
          {constituencies.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="periodStart" className="block text-sm font-medium">Week starting (Monday)</label>
        <input id="periodStart" name="periodStart" type="date" required defaultValue={defaultPeriodStart} className={inputClass} />
      </div>

      <div>
        <label htmlFor="memberCount" className="block text-sm font-medium">Number of people in the group</label>
        <input id="memberCount" name="memberCount" type="number" min={0} step={1} required className={inputClass} />
        <p className="mt-1 text-xs text-black/50 dark:text-white/50">A group needs at least 3 members to count as established.</p>
      </div>

      <div>
        <label htmlFor="postCount" className="block text-sm font-medium">Posts that went into the group this week</label>
        <input id="postCount" name="postCount" type="number" min={0} step={1} required className={inputClass} />
        <p className="mt-1 text-xs text-black/50 dark:text-white/50">
          Posts from the MP&apos;s team for the group to share. At least 1 earns the weekly activity point.
        </p>
      </div>

      <div>
        <label htmlFor="screenshot" className="block text-sm font-medium">Screenshot of the group</label>
        <input
          id="screenshot"
          name="screenshot"
          type="file"
          accept="image/*"
          required
          className="mt-1 w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-black/5 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-black/10 dark:file:bg-white/10 dark:hover:file:bg-white/15"
        />
        <p className="mt-1 text-xs text-black/50 dark:text-white/50">
          Show the member list or count and this week&apos;s posts going in. Under 4MB. It&apos;s only seen by the approvers.
        </p>
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium">Anything the approver should know (optional)</label>
        <textarea id="notes" name="notes" rows={2} maxLength={500} className={inputClass} />
      </div>

      <p className="text-sm text-black/60 dark:text-white/60">
        Saving sends the approvers an email to approve. It won&apos;t count on the tracker until then.
        Sending another report for the same week replaces the earlier one.
      </p>

      {state?.error && <p className="text-sm text-red-700 dark:text-red-400">{state.error}</p>}

      <div className="flex items-center gap-4 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save & send for approval"}
        </button>
        <Link href="/admin/amplifiers" className="text-sm font-medium text-black/70 hover:underline dark:text-white/70">
          Cancel
        </Link>
      </div>
    </form>
  );
}
