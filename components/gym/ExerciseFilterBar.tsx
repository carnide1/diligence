"use client";

import { TextInput } from "@/components/ui/TextInput";

type ExerciseFilterBarProps = {
  query: string;
  onQueryChange: (value: string) => void;
  tag: string;
  onTagChange: (value: string) => void;
  tags: string[];
  resultCount: number;
  totalCount: number;
};

/** Shared search + tag filter for Exercises list and Template picker. */
export function ExerciseFilterBar({
  query,
  onQueryChange,
  tag,
  onTagChange,
  tags,
  resultCount,
  totalCount,
}: ExerciseFilterBarProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <TextInput
          label="Search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Filter by name…"
        />
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-muted">Tag</span>
          <select
            value={tag}
            onChange={(e) => onTagChange(e.target.value)}
            className="h-10 rounded-[var(--radius-sm)] border border-border bg-bg-elevated px-3 text-foreground"
          >
            <option value="">All tags</option>
            {tags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="text-xs text-faint">
        Showing {resultCount} of {totalCount}
      </p>
    </div>
  );
}
