"use client";

import { minutesToLabel } from "@/lib/dayPeriods";
import { useDayPeriodsDraft } from "@/hooks/useDayPeriodsDraft";
import type { DayPartKey } from "@/types/user";
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
  const { periods, saving, onStartChange, onEndChange, save } =
    useDayPeriodsDraft({
      seedOnActivate: true,
      active: open,
    });

  const period = dayPart
    ? periods.find((p) => p.key === dayPart)
    : undefined;

  const onSave = async () => {
    const ok = await save("Day period updated");
    if (ok) onClose();
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
            onBlur={(e) => onStartChange(dayPart, e.target.value)}
          />
          <TextInput
            label="End"
            key={`end-${period.endMinutes}`}
            defaultValue={minutesToLabel(period.endMinutes)}
            onBlur={(e) => onEndChange(dayPart, e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}
