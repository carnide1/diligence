"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/today", label: "Today" },
  { href: "/habits", label: "Habits" },
  { href: "/goals", label: "Goals" },
  { href: "/films", label: "Films" },
  { href: "/calendar", label: "Calendar" },
  { href: "/profile", label: "Profile" },
] as const;

function NavLink({
  href,
  label,
  orientation,
}: {
  href: string;
  label: string;
  orientation: "side" | "bottom";
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  const base =
    orientation === "side"
      ? "rounded-[var(--radius-sm)] px-3 py-2.5 text-sm"
      : "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium";

  const state = active
    ? "bg-accent-soft text-accent"
    : "text-muted hover:bg-bg-overlay hover:text-foreground";

  return (
    <Link href={href} className={`${base} ${state} transition-colors`}>
      {label}
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-bg md:grid md:grid-cols-[var(--sidebar-width)_1fr]">
      <aside className="hidden border-r border-border bg-bg-elevated md:flex md:flex-col md:gap-6 md:p-5">
        <div>
          <p className="font-display text-2xl tracking-tight text-foreground">
            Diligence
          </p>
          <p className="mt-1 text-xs text-faint">Habits & daily goals</p>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} {...item} orientation="side" />
          ))}
        </nav>
      </aside>

      <div className="flex min-h-dvh flex-col bg-bg">
        <header className="flex items-center border-b border-border bg-bg px-4 py-3 md:hidden">
          <p className="font-display text-xl text-foreground">Diligence</p>
        </header>

        <main className="relative flex-1 bg-bg px-4 py-5 pb-[calc(var(--nav-height)+1rem)] md:px-8 md:pb-8">
          {children}
        </main>

        <nav
          className="fixed inset-x-0 bottom-0 z-40 flex h-[var(--nav-height)] border-t border-border bg-bg-elevated md:hidden"
          aria-label="Primary"
        >
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} {...item} orientation="bottom" />
          ))}
        </nav>
      </div>
    </div>
  );
}
