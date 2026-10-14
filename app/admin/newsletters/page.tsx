import Link from "next/link";
import { listConstituencies } from "@/lib/db";
import { listNewsletterEntries } from "@/lib/newsletterManual";
import { addNewsletterAction, deleteNewsletterAction } from "./actions";

// DB-backed — must render per-request.
export const dynamic = "force-dynamic";

export default async function NewslettersAdminPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { error, saved } = await searchParams;
  const [constituencies, entries] = await Promise.all([listConstituencies(), listNewsletterEntries()]);
  const today = new Date().toISOString().slice(0, 10);
  const inputClass = "mt-1 w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Newsletters sent (reported by hand)</h1>
        <p className="mt-2 max-w-2xl text-black/70 dark:text-white/70">
          A stop-gap while automatic newsletter detection is being rebuilt. Record when an MP sent
          a newsletter and it counts toward their monthly newsletter points straight away.
        </p>
      </div>

      {saved && (
        <p className="max-w-md rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          Saved.
        </p>
      )}
      {typeof error === "string" && error && (
        <p className="max-w-md rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      <form action={addNewsletterAction} className="max-w-md space-y-4">
        <div>
          <label htmlFor="constituencyId" className="block text-sm font-medium">MP / constituency</label>
          <select id="constituencyId" name="constituencyId" required defaultValue="" className={inputClass}>
            <option value="" disabled>Choose…</option>
            {constituencies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.mp_or_candidate_name ?? "Unknown"} · {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="sentOn" className="block text-sm font-medium">Date sent</label>
          <input id="sentOn" name="sentOn" type="date" required max={today} defaultValue={today} className={inputClass} />
        </div>
        <div>
          <label htmlFor="subject" className="block text-sm font-medium">Subject (optional)</label>
          <input id="subject" name="subject" type="text" className={inputClass} />
        </div>
        <button type="submit" className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90">
          Record newsletter
        </button>
      </form>

      <div>
        <h2 className="text-lg font-semibold tracking-tight">Recent newsletters</h2>
        <div className="mt-3 overflow-x-auto rounded-lg border border-black/10 dark:border-white/15">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/10 bg-black/[.02] dark:border-white/15 dark:bg-white/[.04]">
              <tr>
                <th className="px-4 py-3 font-medium">Sent</th>
                <th className="px-4 py-3 font-medium">MP</th>
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Recorded</th>
                <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-black/5 last:border-0 dark:border-white/10">
                  <td className="px-4 py-3 tabular-nums">{e.sentOn}</td>
                  <td className="px-4 py-3">{e.mpName} <span className="text-black/50 dark:text-white/50">· {e.constituencyName}</span></td>
                  <td className="px-4 py-3 text-black/70 dark:text-white/70">{e.subject ?? "—"}</td>
                  <td className="px-4 py-3 text-black/60 dark:text-white/60">{e.source === "manual" ? "By hand" : "Automatic"}</td>
                  <td className="px-4 py-3 text-right">
                    {e.source === "manual" && (
                      <form action={deleteNewsletterAction.bind(null, e.id)}>
                        <button type="submit" className="font-medium text-red-700 hover:underline dark:text-red-400">Remove</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-black/50 dark:text-white/50">Nothing recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Link href="/admin" className="text-sm font-medium text-black/70 hover:underline dark:text-white/70">← Back to Admin</Link>
    </div>
  );
}
