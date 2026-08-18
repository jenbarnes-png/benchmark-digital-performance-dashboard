export default function MetricCard({
  title,
  accentColor,
  hasData,
  primary,
  secondary,
}: {
  title: string;
  accentColor?: string;
  hasData: boolean;
  primary: string;
  secondary?: string;
}) {
  return (
    <div className="rounded-lg border border-black/10 p-4 dark:border-white/15">
      <div className="flex items-center gap-2">
        {accentColor && (
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: accentColor }}
            aria-hidden
          />
        )}
        <p className="text-sm font-medium text-black/70 dark:text-white/70">{title}</p>
      </div>
      {hasData ? (
        <>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{primary}</p>
          {secondary && (
            <p className="text-xs text-black/50 dark:text-white/50">{secondary}</p>
          )}
        </>
      ) : (
        <p className="mt-2 text-sm font-medium text-black/40 dark:text-white/40">
          No data reported
        </p>
      )}
    </div>
  );
}
