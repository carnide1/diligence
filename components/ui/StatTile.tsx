"use client";

type StatTileProps = {
  label: string;
  value: string | number;
};

/** Compact label + value tile used on Profile, Goals, and Calendar. */
export function StatTile({ label, value }: StatTileProps) {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-bg-elevated px-4 py-3">
      <p className="text-xs text-faint">{label}</p>
      <p className="mt-1 text-2xl font-medium text-foreground">{value}</p>
    </div>
  );
}
