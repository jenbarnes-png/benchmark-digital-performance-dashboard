export default function PagePlaceholder({
  title,
  description,
  comingSoon,
}: {
  title: string;
  description: string;
  comingSoon: string[];
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 max-w-2xl text-black/70 dark:text-white/70">
          {description}
        </p>
      </div>
      <div className="rounded-lg border border-dashed border-black/20 p-6 dark:border-white/20">
        <p className="text-sm font-medium text-black/50 dark:text-white/50">
          Coming soon
        </p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-black/70 dark:text-white/70">
          {comingSoon.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
