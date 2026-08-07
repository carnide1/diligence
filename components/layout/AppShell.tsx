"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/today", label: "Today" },
  { href: "/habits", label: "Habits" },
  { href: "/goals", label: "Goals" },
  { href: "/gym", label: "Gym" },
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

/** Hide bottom nav while the soft keyboard is open (avoids fixed-nav jump on iOS). */
function useSoftKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const sync = () => {
      // Keyboard typically shrinks the visual viewport by >120px on phones.
      const obscured = window.innerHeight - vv.height;
      setOpen(obscured > 120);
    };

    sync();
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
    };
  }, []);

  return open;
}

export function AppShell({ children }: { children: ReactNode }) {
  const keyboardOpen = useSoftKeyboardOpen();

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

      {/*
        Mobile: flex column with scrollable main + in-flow bottom nav (not
        position:fixed). Fixed bottom bars jump when iOS resizes around the
        keyboard; hiding the nav while the keyboard is open avoids overlap.
      */}
      <div className="flex h-dvh flex-col overflow-hidden bg-bg md:min-h-dvh md:h-auto md:overflow-visible">
        <header className="flex shrink-0 items-center border-b border-border bg-bg px-4 py-3 md:hidden">
          <p className="font-display text-xl text-foreground">Diligence</p>
        </header>

        <main className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain bg-bg px-4 py-5 md:overflow-visible md:px-8 md:pb-8">
          {children}
        </main>

        <nav
          className={[
            "z-40 shrink-0 border-t border-border bg-bg-elevated md:hidden",
            // Height = bar + home-indicator inset (border-box would squash content if pb were inside a fixed h-*).
            "flex min-h-[var(--nav-height)] pb-[env(safe-area-inset-bottom,0px)]",
            keyboardOpen ? "hidden" : "",
          ].join(" ")}
          aria-label="Primary"
          aria-hidden={keyboardOpen}
        >
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} {...item} orientation="bottom" />
          ))}
        </nav>
      </div>
    </div>
  );
}
