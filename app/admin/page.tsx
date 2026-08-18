import Link from "next/link";

const sections = [
  {
    href: "/admin/constituencies",
    label: "Constituencies",
    description: "See and edit constituency names, MPs/candidates, and regions.",
    available: true,
  },
  {
    href: null,
    label: "Ad spend, posting & newsletter data",
    description: "Manual entry for data that can't be pulled in automatically.",
    available: false,
  },
];

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin / Data Entry</h1>
        <p className="mt-2 max-w-2xl text-black/70 dark:text-white/70">
          Where MPs&apos; teams and admins enter or check data.
        </p>
      </div>

      <ul className="divide-y divide-black/10 rounded-lg border border-black/10 dark:divide-white/15 dark:border-white/15">
        {sections.map((section) => (
          <li key={section.label} className="flex items-center justify-between gap-4 px-4 py-4">
            <div>
              <p className="font-medium">{section.label}</p>
              <p className="text-sm text-black/60 dark:text-white/60">{section.description}</p>
            </div>
            {section.available && section.href ? (
              <Link
                href={section.href}
                className="whitespace-nowrap rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background hover:opacity-90"
              >
                Open
              </Link>
            ) : (
              <span className="whitespace-nowrap text-sm text-black/40 dark:text-white/40">
                Coming soon
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
