"use client";

import { TextInput } from "@/components/ui/TextInput";
import { FORM_SELECT_CLASS } from "@/components/ui/formStyles";

type ExerciseFilterBarProps = {
  query: string;
  onQueryChange: (value: string) => void;
  tag: string;
  onTagChange: (value: string) => void;
  tags: string[];
  location?: string;
  onLocationChange?: (value: string) => void;
  locations?: string[];
  resultCount: number;
  totalCount: number;
};

/** Shared search + tag/location filter for Exercises list and Template picker. */
export function ExerciseFilterBar({
  query,
  onQueryChange,
  tag,
  onTagChange,
  tags,
  location = "",
  onLocationChange,
  locations = [],
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
            className={`${FORM_SELECT_CLASS} bg-bg-elevated`}
          >
            <option value="">All tags</option>
            {tags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        {onLocationChange ? (
          <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
            <span className="font-medium text-muted">Location</span>
            <select
              value={location}
              onChange={(e) => onLocationChange(e.target.value)}
              className={`${FORM_SELECT_CLASS} bg-bg-elevated`}
            >
              <option value="">All locations</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      <p className="text-xs text-faint">
        Showing {resultCount} of {totalCount}
      </p>
    </div>
  );
}
