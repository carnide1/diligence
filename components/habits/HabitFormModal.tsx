"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { DAY_PART_KEYS, DAY_PART_LABELS, type DayPartKey } from "@/types/user";
import type { Habit, HabitInput, HabitSchedule } from "@/types/habit";
import { DEFAULT_HABIT_ICON } from "@/lib/habitIcons";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { IconPicker } from "@/components/icons/IconPicker";

const WEEKDAY_OPTIONS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
] as const;

const schema = z.object({
  title: z.string().trim().min(1, "Title is required").max(80),
  description: z.string().max(280).optional(),
  dayPart: z.custom<DayPartKey>((v) =>
    typeof v === "string" && (DAY_PART_KEYS as readonly string[]).includes(v),
  ),
  scheduleType: z.enum(["everyDay", "weekdays", "timesPerWeek"]),
  timesPerWeek: z.number().int().min(1).max(7).optional(),
});

type FormValues = z.infer<typeof schema>;

type HabitFormModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: HabitInput) => Promise<void>;
  initial?: Habit | null;
};

export function HabitFormModal({
  open,
  onClose,
  onSubmit,
  initial,
}: HabitFormModalProps) {
  const [icon, setIcon] = useState(DEFAULT_HABIT_ICON);
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [submitting, setSubmitting] = useState(false);

  const defaults = useMemo<FormValues>(
    () => ({
      title: initial?.title ?? "",
      description: initial?.description ?? "",
      dayPart: initial?.dayPart ?? "morning",
      scheduleType: initial?.schedule.type ?? "everyDay",
      timesPerWeek:
        initial?.schedule.type === "timesPerWeek" ? initial.schedule.n : 3,
    }),
    [initial],
  );

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  const scheduleType = watch("scheduleType");

  useEffect(() => {
    if (!open) return;
    reset(defaults);
    setIcon(initial?.icon ?? DEFAULT_HABIT_ICON);
    setWeekdays(
      initial?.schedule.type === "weekdays"
        ? [...initial.schedule.days]
        : [1, 2, 3, 4, 5],
    );
  }, [open, initial, defaults, reset]);

  const toggleDay = (day: number) => {
    setWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  };

  const submit = handleSubmit(async (values) => {
    let schedule: HabitSchedule;
    if (values.scheduleType === "weekdays") {
      if (weekdays.length === 0) {
        return;
      }
      schedule = { type: "weekdays", days: weekdays };
    } else if (values.scheduleType === "timesPerWeek") {
      schedule = { type: "timesPerWeek", n: values.timesPerWeek ?? 3 };
    } else {
      schedule = { type: "everyDay" };
    }

    setSubmitting(true);
    try {
      await onSubmit({
        title: values.title,
        description: values.description ?? "",
        icon,
        dayPart: values.dayPart,
        schedule,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Modal
      open={open}
      title={initial ? "Edit habit" : "Add habit"}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <TextInput
          label="Title"
          error={errors.title?.message}
          {...register("title")}
        />
        <TextInput
          label="Description"
          error={errors.description?.message}
          {...register("description")}
        />
        <IconPicker value={icon} onChange={setIcon} />

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-muted">Day part</span>
          <select
            className="h-10 rounded-[var(--radius-sm)] border border-border bg-bg-elevated px-3 text-foreground"
            {...register("dayPart")}
          >
            {DAY_PART_KEYS.map((key) => (
              <option key={key} value={key}>
                {DAY_PART_LABELS[key]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-muted">Schedule</span>
          <select
            className="h-10 rounded-[var(--radius-sm)] border border-border bg-bg-elevated px-3 text-foreground"
            {...register("scheduleType")}
          >
            <option value="everyDay">Every day</option>
            <option value="weekdays">Specific weekdays</option>
            <option value="timesPerWeek">N times per week</option>
          </select>
        </label>

        {scheduleType === "weekdays" ? (
          <div className="space-y-1.5">
            <span className="text-sm font-medium text-muted">Days</span>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAY_OPTIONS.map((day) => {
                const active = weekdays.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={[
                      "h-8 min-w-10 rounded-[var(--radius-sm)] px-2 text-xs font-medium",
                      active
                        ? "bg-accent-soft text-accent"
                        : "bg-bg-overlay text-muted",
                    ].join(" ")}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
            {weekdays.length === 0 ? (
              <p className="text-xs text-danger">Pick at least one day</p>
            ) : null}
          </div>
        ) : null}

        {scheduleType === "timesPerWeek" ? (
          <TextInput
            label="Times per week"
            type="number"
            min={1}
            max={7}
            error={errors.timesPerWeek?.message}
            {...register("timesPerWeek", { valueAsNumber: true })}
          />
        ) : null}
      </form>
    </Modal>
  );
}
