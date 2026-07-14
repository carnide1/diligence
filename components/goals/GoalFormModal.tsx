"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { DAY_PART_KEYS, DAY_PART_LABELS, type DayPartKey } from "@/types/user";
import type { Goal, GoalInput } from "@/types/goal";
import { DEFAULT_HABIT_ICON } from "@/lib/habitIcons";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { IconPicker } from "@/components/icons/IconPicker";

const schema = z.object({
  title: z.string().trim().min(1, "Title is required").max(80),
  description: z.string().max(280).optional(),
  dayPart: z.custom<DayPartKey>((v) =>
    typeof v === "string" && (DAY_PART_KEYS as readonly string[]).includes(v),
  ),
});

type FormValues = z.infer<typeof schema>;

type GoalFormModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: GoalInput) => Promise<void>;
  initial?: Goal | null;
};

export function GoalFormModal({
  open,
  onClose,
  onSubmit,
  initial,
}: GoalFormModalProps) {
  const [icon, setIcon] = useState(DEFAULT_HABIT_ICON);
  const [submitting, setSubmitting] = useState(false);

  const defaults = useMemo<FormValues>(
    () => ({
      title: initial?.title ?? "",
      description: initial?.description ?? "",
      dayPart: initial?.dayPart ?? "morning",
    }),
    [initial],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      reset(defaults);
      setIcon(initial?.icon ?? DEFAULT_HABIT_ICON);
    }, 0);
    return () => clearTimeout(timer);
  }, [open, initial, defaults, reset]);

  const submit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      await onSubmit({
        title: values.title,
        description: values.description ?? "",
        icon,
        dayPart: values.dayPart,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Modal
      open={open}
      title={initial ? "Edit goal" : "Add goal"}
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
        <p className="text-xs text-faint">
          Goals are for today only. Unfinished ones roll over automatically.
        </p>
      </form>
    </Modal>
  );
}
