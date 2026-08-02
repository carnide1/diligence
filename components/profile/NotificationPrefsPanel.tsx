"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { toErrorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/Button";
import type { NotificationPrefs } from "@/types/user";

export function NotificationPrefsPanel() {
  const { profile, saveNotificationPrefs } = useUserProfile();
  const [saving, setSaving] = useState(false);

  if (!profile) return null;

  const prefs = profile.notificationPrefs;

  const update = async (patch: Partial<NotificationPrefs>) => {
    const next = { ...prefs, ...patch };
    setSaving(true);
    try {
      await saveNotificationPrefs(next);
      toast.success("Notification prefs saved");
    } catch (err) {
      toast.error(toErrorMessage(err, "Could not save prefs"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-medium text-foreground">Email nags</h2>
        <p className="mt-1 text-sm text-muted">
          Diligence emails you about once per day (Vercel Hobby cron limit)
          when habits/goals are overdue or gym still needs work. Quiet hours
          are 9pm–7am local. Timezone:{" "}
          <span className="text-foreground">{profile.timezone}</span>
        </p>
      </div>

      <ul className="space-y-3 rounded-[var(--radius)] border border-border bg-bg-elevated px-4 py-3">
        <ToggleRow
          label="Enable email nags"
          checked={prefs.enabled}
          disabled={saving}
          onChange={(enabled) => void update({ enabled })}
        />
        <ToggleRow
          label="Gym (plan / complete / week at risk)"
          checked={prefs.gymNags}
          disabled={saving || !prefs.enabled}
          onChange={(gymNags) => void update({ gymNags })}
        />
        <ToggleRow
          label="Habits & goals overdue"
          checked={prefs.habitsGoalsNags}
          disabled={saving || !prefs.enabled}
          onChange={(habitsGoalsNags) => void update({ habitsGoalsNags })}
        />
      </ul>

      <Button
        variant="ghost"
        size="sm"
        disabled={saving}
        onClick={() =>
          void update({
            enabled: true,
            gymNags: true,
            habitsGoalsNags: true,
          })
        }
      >
        Reset to annoy-me defaults
      </Button>
    </section>
  );
}

function ToggleRow({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="text-sm text-foreground">{label}</span>
      <input
        type="checkbox"
        className="size-4 accent-[var(--accent)]"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
    </li>
  );
}
