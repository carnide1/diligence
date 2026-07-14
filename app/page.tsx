import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-end gap-10 px-6 pb-16 pt-24 md:justify-center md:pb-24">
        <div className="max-w-xl space-y-5">
          <p className="font-display text-5xl leading-none tracking-tight text-foreground md:text-7xl">
            Diligence
          </p>
          <h1 className="max-w-md text-lg font-medium leading-snug text-muted md:text-xl">
            Habits on a schedule. Goals for today. Streaks that mean something.
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-faint">
            A minimal accountability tool — dark, focused, and private to your
            account.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center justify-center rounded-[var(--radius-sm)] bg-accent px-5 text-base font-medium text-bg transition-[filter] hover:brightness-110"
            >
              Sign up
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center rounded-[var(--radius-sm)] border border-border bg-bg-overlay px-5 text-base font-medium text-foreground transition-colors hover:border-border-strong"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
