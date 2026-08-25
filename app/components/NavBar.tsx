import Image from "next/image";
import Link from "next/link";

const navItems = [
  { href: "/", label: "National Dashboard" },
  { href: "/rankings", label: "Rankings" },
  { href: "/constituency", label: "Constituency Detail" },
  { href: "/scoring", label: "How Scoring Works" },
  { href: "/admin", label: "Admin / Data Entry" },
];

export default function NavBar() {
  return (
    <header className="border-b border-black/10 dark:border-white/15">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-6 px-6 py-4">
        <div className="flex items-center gap-3">
          <Image
            src="/project-beacon-logo.png"
            alt="Project Beacon — Operation Second Term"
            width={1477}
            height={856}
            className="h-9 w-auto"
            priority
          />
        </div>
        <nav className="flex flex-wrap gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-black/70 hover:bg-black/5 hover:text-black dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
