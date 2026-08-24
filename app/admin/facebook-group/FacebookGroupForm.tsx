"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { Constituency } from "@/lib/db";
import type { FacebookGroupEntry } from "@/lib/facebookGroupActivity";
import type { FormState } from "./actions";

export default function FacebookGroupForm({
  action,
  constituencies,
  initialValues,
  defaultPeriodStart,
  lockKey,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  constituencies: Constituency[];
  initialValues?: FacebookGroupEntry;
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
        <label htmlFor="postCount" className="block text-sm font-medium">
          Facebook group posts this week
        </label>
        <input
          id="postCount"
          name="postCount"
          type="number"
          min={0}
          step={1}
          defaultValue={initialValues?.postCount ?? ""}
          placeholder="Leave blank if not tracked this week"
          className="mt-1 w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20"
        />
      </div>

      <div>
        <label htmlFor="postUrl" className="block text-sm font-medium">
          Link to the post
        </label>
        <input
          id="postUrl"
          name="postUrl"
          type="url"
          defaultValue={initialValues?.postUrl ?? ""}
          placeholder="https://facebook.com/groups/…"
          className="mt-1 w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20"
        />
      </div>

      <div>
        <label htmlFor="screenshot" className="block text-sm font-medium">
          Screenshot of the post
        </label>
        {initialValues?.hasScreenshot && (
          <div className="mt-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- served from our own dynamic DB-backed route, not a static asset next/image can optimize */}
            <img
              src={`/admin/facebook-group/screenshot/${initialValues.id}`}
              alt="Current screenshot"
              className="h-32 w-auto rounded-md border border-black/10 dark:border-white/15"
            />
            <p className="mt-1 text-xs text-black/50 dark:text-white/50">Current screenshot — choose a file below to replace it.</p>
          </div>
        )}
        <input
          id="screenshot"
          name="screenshot"
          type="file"
          accept="image/*"
          className="mt-1 w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-black/5 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-black/10 dark:file:bg-white/10 dark:hover:file:bg-white/15"
        />
      </div>

      <p className="text-sm text-black/60 dark:text-white/60">
        Saving sends jenbarnes@fouroneone.co.uk and alexcreighton@fouroneone.co.uk an email to
        approve — it won&apos;t count on the tracker until then.
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
        <Link
          href="/admin/facebook-group"
          className="text-sm font-medium text-black/70 hover:underline dark:text-white/70"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
