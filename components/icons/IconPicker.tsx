"use client";

import { HABIT_ICONS } from "@/lib/habitIcons";

type IconPickerProps = {
  value: string;
  onChange: (key: string) => void;
};

export function IconPicker({ value, onChange }: IconPickerProps) {
  return (
    <div className="space-y-1.5">
      <span className="text-sm font-medium text-muted">Icon</span>
      <div className="grid max-h-48 grid-cols-7 gap-1.5 overflow-y-auto pr-0.5">
        {HABIT_ICONS.map(({ key, label, Icon }) => {
          const active = value === key;
          return (
            <button
              key={key}
              type="button"
              title={label}
              aria-label={label}
              aria-pressed={active}
              onClick={() => onChange(key)}
              className={[
                "flex h-9 w-full items-center justify-center rounded-[var(--radius-sm)] border transition-colors",
                active
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border bg-bg text-muted hover:border-border-strong hover:text-foreground",
              ].join(" ")}
            >
              <Icon size={18} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
