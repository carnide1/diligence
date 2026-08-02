"use client";

import { useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import { useGym } from "@/contexts/GymContext";
import { toErrorMessage } from "@/lib/errors";
import { toLocalDateString } from "@/lib/dates";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";

export function GymAbsencesPanel() {
  const { absences, addAbsence } = useGym();
  const [description, setDescription] = useState("");
  const [startLocalDate, setStartLocalDate] = useState(() =>
    toLocalDateString(),
  );
  const [endLocalDate, setEndLocalDate] = useState(() => toLocalDateString());
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const desc = description.trim();
    if (!desc) {
      toast.error("Description is required");
      return;
    }
    if (!startLocalDate || !endLocalDate) {
      toast.error("Start and end dates are required");
      return;
    }
    if (endLocalDate < startLocalDate) {
      toast.error("End date must be on or after start date");
      return;
    }

    setSubmitting(true);
    try {
      await addAbsence({
        description: desc,
        startLocalDate,
        endLocalDate,
      });
      toast.success("Break added");
      setDescription("");
      const today = toLocalDateString();
      setStartLocalDate(today);
      setEndLocalDate(today);
    } catch (err) {
      toast.error(toErrorMessage(err, "Could not add break"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={(e) => void onSubmit(e)}
        className="flex flex-col gap-4 rounded-[var(--radius)] border border-border bg-bg-elevated p-4"
      >
        <div>
          <h2 className="font-display text-lg text-foreground">Add a break</h2>
          <p className="mt-1 text-sm text-muted">
            Reduces the weekly workout requirement while you&apos;re away.
          </p>
        </div>
        <TextInput
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Travel"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextInput
            label="Start"
            type="date"
            value={startLocalDate}
            onChange={(e) => setStartLocalDate(e.target.value)}
          />
          <TextInput
            label="End"
            type="date"
            value={endLocalDate}
            onChange={(e) => setEndLocalDate(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Add break"}
        </Button>
      </form>

      {absences.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-border bg-bg-elevated px-4 py-8 text-center text-sm text-muted">
          No breaks recorded.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {absences.map((a) => (
            <li
              key={a.id}
              className="rounded-[var(--radius)] border border-border bg-bg-elevated px-4 py-3"
            >
              <p className="font-medium text-foreground">{a.description}</p>
              <p className="mt-1 text-xs text-muted">
                {a.startLocalDate}
                {a.endLocalDate !== a.startLocalDate
                  ? ` → ${a.endLocalDate}`
                  : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
