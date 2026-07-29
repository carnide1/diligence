"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";

type EntityListShellProps = {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  loading: boolean;
  loadingLabel: string;
  error: string | null;
  onRetry: () => void;
  empty: boolean;
  emptyLabel: string;
  /** Optional content between header and list (e.g. streak stats). */
  beforeList?: ReactNode;
  children: ReactNode;
};

/** Shared page chrome for Habits / Goals list screens. */
export function EntityListShell({
  title,
  description,
  actionLabel,
  onAction,
  loading,
  loadingLabel,
  error,
  onRetry,
  empty,
  emptyLabel,
  beforeList,
  children,
}: EntityListShellProps) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-3xl tracking-tight text-foreground">
            {title}
          </h1>
          <p className="text-sm text-muted">{description}</p>
        </div>
        <Button onClick={onAction}>{actionLabel}</Button>
      </div>

      {beforeList}

      {loading ? <p className="text-sm text-muted">{loadingLabel}</p> : null}

      {error ? (
        <div className="rounded-[var(--radius)] border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger">
          <p>{error}</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={onRetry}
          >
            Retry
          </Button>
        </div>
      ) : null}

      {!loading && !error && empty ? (
        <div className="rounded-[var(--radius)] border border-border bg-bg-elevated px-4 py-8 text-center text-sm text-muted">
          {emptyLabel}
        </div>
      ) : null}

      {children}
    </div>
  );
}
