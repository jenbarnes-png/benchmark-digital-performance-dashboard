"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { Constituency } from "@/lib/db";
import type { FormState } from "./actions";

export default function ConstituencyForm({
  action,
  initialValues,
  submitLabel,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  initialValues?: Constituency;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, null);

  return (
    <form action={formAction} className="max-w-md space-y-5">
      <div>
        <label htmlFor="name" className="block text-sm font-medium">
          Constituency name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={initialValues?.name}
          className="mt-1 w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20"
          placeholder="e.g. Holborn and St Pancras"
        />
      </div>

      <div>
        <label htmlFor="mpOrCandidateName" className="block text-sm font-medium">
          MP / candidate name
        </label>
        <input
          id="mpOrCandidateName"
          name="mpOrCandidateName"
          type="text"
          defaultValue={initialValues?.mp_or_candidate_name ?? ""}
          className="mt-1 w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20"
          placeholder="Leave blank if not yet known"
        />
      </div>

      <div>
        <label htmlFor="region" className="block text-sm font-medium">
          Region / nation
        </label>
        <input
          id="region"
          name="region"
          type="text"
          required
          defaultValue={initialValues?.region}
          className="mt-1 w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20"
          placeholder="e.g. London, Scotland, Wales, Northern Ireland"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="isPilot"
          name="isPilot"
          type="checkbox"
          defaultChecked={Boolean(initialValues?.is_pilot)}
          className="h-4 w-4 rounded border-black/30 dark:border-white/30"
        />
        <label htmlFor="isPilot" className="text-sm font-medium">
          Included in the pilot
        </label>
      </div>

      <fieldset className="space-y-4 border-t border-black/10 pt-5 dark:border-white/15">
        <legend className="px-0 text-sm font-medium text-black/70 dark:text-white/70">
          Social media profiles (optional)
        </legend>
        {(
          [
            ["facebookUrl", "Facebook", initialValues?.facebook_url],
            ["tiktokUrl", "TikTok", initialValues?.tiktok_url],
            ["instagramUrl", "Instagram", initialValues?.instagram_url],
            ["xUrl", "X", initialValues?.x_url],
          ] as const
        ).map(([fieldName, label, value]) => (
          <div key={fieldName}>
            <label htmlFor={fieldName} className="block text-sm font-medium">
              {label}
            </label>
            <input
              id={fieldName}
              name={fieldName}
              type="url"
              defaultValue={value ?? ""}
              className="mt-1 w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20"
              placeholder="https://..."
            />
          </div>
        ))}
      </fieldset>

      {state?.error && (
        <p className="text-sm text-red-700 dark:text-red-400">{state.error}</p>
      )}

      <div className="flex items-center gap-4 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
        <Link
          href="/admin/constituencies"
          className="text-sm font-medium text-black/70 hover:underline dark:text-white/70"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
