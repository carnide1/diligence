import Link from "next/link";
import type { ReactNode } from "react";

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-8 px-6 py-12">
      <div className="space-y-2">
        <Link
          href="/"
          className="font-display text-3xl tracking-tight text-foreground"
        >
          Diligence
        </Link>
        <h1 className="text-lg font-medium text-muted">{title}</h1>
        {subtitle ? (
          <p className="text-sm leading-relaxed text-faint">{subtitle}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}
