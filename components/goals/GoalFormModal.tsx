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
import { FORM_SELECT_CLASS } from "@/components/ui/formStyles";
import { IconPicker } from "@/components/icons/IconPicker";

const schema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(80),
    description: z.string().max(280).optional(),
    dayPart: z.custom<DayPartKey>((v) =>
      typeof v === "string" && (DAY_PART_KEYS as readonly string[]).includes(v),
    ),
    limitedDates: z.boolean(),
    activeStartLocalDate: z.string().optional(),
    activeEndLocalDate: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (!values.limitedDates) return;
    const start = values.activeStartLocalDate?.trim() || "";
    const end = values.activeEndLocalDate?.trim() || "";
    if (!start && !end) {
      ctx.addIssue({
        code: "custom",
        message: "Pick a start date, end date, or both",
        path: ["activeStartLocalDate"],
      });
      return;
    }
    if (start && end && start > end) {
      ctx.addIssue({
        code: "custom",
        message: "Start must be on or before end",
        path: ["activeEndLocalDate"],
      });
    }
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
      limitedDates: Boolean(
        initial?.activeStartLocalDate || initial?.activeEndLocalDate,
      ),
      activeStartLocalDate: initial?.activeStartLocalDate ?? "",
      activeEndLocalDate: initial?.activeEndLocalDate ?? "",
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

  const limitedDates = watch("limitedDates");

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
        activeStartLocalDate: values.limitedDates
          ? values.activeStartLocalDate?.trim() || null
          : null,
        activeEndLocalDate: values.limitedDates
          ? values.activeEndLocalDate?.trim() || null
          : null,
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
      <form className="flex flex-col gap-6" onSubmit={submit}>
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
          <select className={FORM_SELECT_CLASS} {...register("dayPart")}>
            {DAY_PART_KEYS.map((key) => (
              <option key={key} value={key}>
                {DAY_PART_LABELS[key]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" {...register("limitedDates")} />
          Limited date range
        </label>

        {limitedDates ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label="Start date"
              type="date"
              error={errors.activeStartLocalDate?.message}
              {...register("activeStartLocalDate")}
            />
            <TextInput
              label="End date"
              type="date"
              error={errors.activeEndLocalDate?.message}
              {...register("activeEndLocalDate")}
            />
          </div>
        ) : null}

        <p className="text-xs text-faint">
          Goals are for today only. Unfinished ones roll over automatically.
          Past the end date they are removed.
        </p>
      </form>
    </Modal>
  );
}
