"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { Constituency } from "@/lib/db";
import type { OrganicPostEntry } from "@/lib/organicPosts";
import type { FormState } from "./actions";

export default function OrganicPostForm({
  action,
  constituencies,
  initialValues,
  defaultPeriodStart,
  lockKey,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  constituencies: Constituency[];
  initialValues?: OrganicPostEntry;
  defaultPeriodStart: string;
  /** True when editing an existing entry — constituency/week are the
   * record's identity, so they're locked rather than left free to
   * change into a different (constituency, week) pair mid-edit. */
  lockKey: boolean;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, null);
  const periodStart = initialValues?.periodStart ?? defaultPeriodStart;

  return (
    <form action={formAction} className="max-w-md space-y-5">
      <div>
        <label htmlFor="constituencyId" className="block text-sm font-medium">
          Constituency
        </label>
        <select
          id="constituencyId"
          name={lockKey ? undefined : "constituencyId"}
          required
          disabled={lockKey}
          defaultValue={initialValues?.constituencyId ?? ""}
          className="mt-1 w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm disabled:opacity-60 dark:border-white/20"
        >
          <option value="" disabled>
            Choose a constituency…
          </option>
          {constituencies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {lockKey && <input type="hidden" name="constituencyId" value={initialValues?.constituencyId} />}
      </div>

      <div>
        <label htmlFor="periodStart" className="block text-sm font-medium">
          Week starting (Monday)
        </label>
        <input
          id="periodStart"
          name={lockKey ? undefined : "periodStart"}
          type="date"
          required
          disabled={lockKey}
          defaultValue={periodStart}
          className="mt-1 w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm disabled:opacity-60 dark:border-white/20"
        />
        {lockKey && <input type="hidden" name="periodStart" value={periodStart} />}
      </div>

      <div>
        <label htmlFor="facebookPostCount" className="block text-sm font-medium">
          Facebook posts this week
        </label>
        <input
          id="facebookPostCount"
          name="facebookPostCount"
          type="number"
          min={0}
          step={1}
          defaultValue={initialValues?.counts.Facebook.postCount ?? ""}
          placeholder="Leave blank if not tracked this week"
          className="mt-1 w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20"
        />
      </div>

      <div>
        <label htmlFor="instagramPostCount" className="block text-sm font-medium">
          Instagram posts this week
        </label>
        <input
          id="instagramPostCount"
          name="instagramPostCount"
          type="number"
          min={0}
          step={1}
          defaultValue={initialValues?.counts.Instagram.postCount ?? ""}
          placeholder="Leave blank if not tracked this week"
          className="mt-1 w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20"
        />
      </div>

      {state?.error && <p className="text-sm text-red-700 dark:text-red-400">{state.error}</p>}

      <div className="flex items-center gap-4 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <Link
          href="/admin/organic-posts"
          className="text-sm font-medium text-black/70 hover:underline dark:text-white/70"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
