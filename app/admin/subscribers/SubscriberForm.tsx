"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { Constituency } from "@/lib/db";
import type { SubscriberCountEntry } from "@/lib/subscriberCounts";
import type { FormState } from "./actions";

export default function SubscriberForm({
  action,
  constituencies,
  initialValues,
  defaultMonthStart,
  lockKey,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  constituencies: Constituency[];
  initialValues?: SubscriberCountEntry;
  defaultMonthStart: string;
  /** True when editing — constituency/month are the record's identity, locked rather than free to change mid-edit. */
  lockKey: boolean;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, null);
  const monthStart = (initialValues?.monthStart ?? defaultMonthStart).slice(0, 7);

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
        <label htmlFor="monthStart" className="block text-sm font-medium">
          Month
        </label>
        <input
          id="monthStart"
          name={lockKey ? undefined : "monthStart"}
          type="month"
          required
          disabled={lockKey}
          defaultValue={monthStart}
          className="mt-1 w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm disabled:opacity-60 dark:border-white/20"
        />
        {lockKey && <input type="hidden" name="monthStart" value={monthStart} />}
      </div>

      <div>
        <label htmlFor="subscriberCount" className="block text-sm font-medium">
          Total email subscribers, end of month
        </label>
        <input
          id="subscriberCount"
          name="subscriberCount"
          type="number"
          min={0}
          step={1}
          defaultValue={initialValues?.subscriberCount ?? ""}
          placeholder="Leave blank if not tracked this month"
          className="mt-1 w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20"
        />
        <p className="mt-1 text-xs text-black/50 dark:text-white/50">
          The total list size, not the number of new sign-ups — growth is worked out from last
          month&apos;s total.
        </p>
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
        <Link href="/admin/subscribers" className="text-sm font-medium text-black/70 hover:underline dark:text-white/70">
          Cancel
        </Link>
      </div>
    </form>
  );
}
