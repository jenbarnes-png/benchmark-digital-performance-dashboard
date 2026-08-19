import type { AdListItem } from "@/lib/ads";

function formatDate(iso: string | null): string {
  if (!iso) return "unknown";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatSpend(item: AdListItem): string {
  if (item.spendMin === null && item.spendMax === null) return "Spend not disclosed";
  const currency = item.currency ?? "GBP";
  const symbol = currency === "GBP" ? "£" : `${currency} `;
  return `${symbol}${item.spendMin?.toLocaleString() ?? "0"}–${symbol}${item.spendMax?.toLocaleString() ?? "?"}`;
}

export default function AdsList({ ads }: { ads: AdListItem[] }) {
  if (ads.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-black/20 p-6 text-center text-sm text-black/50 dark:border-white/20 dark:text-white/50">
        No ads found for this constituency yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {ads.map((ad) => (
        <div key={ad.id} className="rounded-lg border border-black/10 p-4 dark:border-white/15">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              {ad.isActive && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                  Active
                </span>
              )}
              {ad.publisherPlatforms?.map((p) => (
                <span
                  key={p}
                  className="rounded-full bg-black/5 px-2 py-0.5 text-xs text-black/60 dark:bg-white/10 dark:text-white/60"
                >
                  {p}
                </span>
              ))}
            </div>
            <span className="text-sm font-medium tabular-nums">{formatSpend(ad)}</span>
          </div>

          {ad.creativeLinkTitle && (
            <p className="mt-2 text-sm font-semibold">{ad.creativeLinkTitle}</p>
          )}
          {ad.creativeBody && (
            <p className="mt-1 whitespace-pre-line text-sm text-black/70 dark:text-white/70">
              {ad.creativeBody}
            </p>
          )}
          {!ad.creativeBody && !ad.creativeLinkTitle && (
            <p className="mt-2 text-sm text-black/40 dark:text-white/40">No text creative available.</p>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-black/50 dark:text-white/50">
              {formatDate(ad.deliveryStart)} — {ad.deliveryStop ? formatDate(ad.deliveryStop) : "ongoing"}
            </span>
            <a
              href={ad.publicLibraryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md bg-black/5 px-3 py-1.5 text-xs font-medium text-black/70 hover:bg-black/10 dark:bg-white/10 dark:text-white/70 dark:hover:bg-white/15"
            >
              See full ad &amp; image/video on Meta →
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}
