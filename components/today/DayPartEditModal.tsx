"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  adjustPeriodEnd,
  adjustPeriodStart,
  labelToMinutes,
  minutesToLabel,
  validateDayPeriods,
} from "@/lib/dayPeriods";
import { useUserProfile } from "@/contexts/UserProfileContext";
import type { DayPartKey, DayPeriod } from "@/types/user";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";

type DayPartEditModalProps = {
  open: boolean;
  dayPart: DayPartKey | null;
  onClose: () => void;
};

export function DayPartEditModal({
  open,
  dayPart,
  onClose,
}: DayPartEditModalProps) {
  const { profile, saveDayPeriods } = useUserProfile();
  const [draft, setDraft] = useState<DayPeriod[] | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !profile) return;
    const timer = setTimeout(() => setDraft(profile.dayPeriods.map((p) => ({ ...p }))), 0);
    return () => clearTimeout(timer);
  }, [open, profile, dayPart]);

  const periods = draft ?? profile?.dayPeriods ?? [];
  const period = dayPart
    ? periods.find((p) => p.key === dayPart)
    : undefined;

  const apply = (result: DayPeriod[] | { error: string }) => {
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    setDraft(result);
  };

  const onSave = async () => {
    const error = validateDayPeriods(periods);
    if (error) {
      toast.error(error);
      return;
    }
    setSaving(true);
    try {
      await saveDayPeriods(periods);
      toast.success("Day period updated");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!period || !dayPart) {
    return (
      <Modal open={open} title="Edit day part" onClose={onClose}>
        <p className="text-sm text-muted">Period not found.</p>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      title={`Edit ${period.label}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void onSave()} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted">
          Neighbors adjust automatically so the full day stays covered.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <TextInput
            label="Start"
            key={`start-${period.startMinutes}`}
            defaultValue={minutesToLabel(period.startMinutes)}
            onBlur={(e) => {
              const minutes = labelToMinutes(e.target.value);
              if (minutes === null) return;
              apply(adjustPeriodStart(periods, dayPart, minutes));
            }}
          />
          <TextInput
            label="End"
            key={`end-${period.endMinutes}`}
            defaultValue={minutesToLabel(period.endMinutes)}
            onBlur={(e) => {
              const minutes = labelToMinutes(e.target.value);
              if (minutes === null) return;
              apply(adjustPeriodEnd(periods, dayPart, minutes));
            }}
          />
        </div>
      </div>
    </Modal>
  );
}
