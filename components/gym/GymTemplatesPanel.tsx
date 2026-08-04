"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Pencil, Trash2 } from "lucide-react";
import { useGym } from "@/contexts/GymContext";
import { toErrorMessage } from "@/lib/errors";
import { collectUniqueTags, filterExercises } from "@/lib/gymValidate";
import {
  CARDIO_MINUTES_MIN,
  WARMUP_MINUTES_MIN,
  WEEKLY_WORKOUT_TARGET,
  type GymTemplate,
} from "@/types/gym";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { TextInput } from "@/components/ui/TextInput";
import { ExerciseFilterBar } from "@/components/gym/ExerciseFilterBar";

type FormState = {
  name: string;
  exerciseIds: string[];
  warmupMinutesTarget: string;
  cardioMinutesTarget: string;
  cardioCaloriesTarget: string;
};

const emptyForm = (): FormState => ({
  name: "",
  exerciseIds: [],
  warmupMinutesTarget: String(WARMUP_MINUTES_MIN),
  cardioMinutesTarget: String(CARDIO_MINUTES_MIN),
  cardioCaloriesTarget: "100",
});

export function GymTemplatesPanel() {
  const {
    templates,
    exercises,
    addTemplate,
    editTemplate,
    removeTemplate,
  } = useGym();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<GymTemplate | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("");

  const allTags = useMemo(() => collectUniqueTags(exercises), [exercises]);
  const filteredExercises = useMemo(
    () => filterExercises(exercises, { query, tag }),
    [exercises, query, tag],
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setQuery("");
    setTag("");
    setModalOpen(true);
  };

  const openEdit = (tpl: GymTemplate) => {
    setEditing(tpl);
    setForm({
      name: tpl.name,
      exerciseIds: [...tpl.exerciseIds],
      warmupMinutesTarget: String(tpl.warmupMinutesTarget),
      cardioMinutesTarget: String(tpl.cardioMinutesTarget),
      cardioCaloriesTarget: String(tpl.cardioCaloriesTarget),
    });
    setQuery("");
    setTag("");
    setModalOpen(true);
  };

  const toggleExercise = (id: string) => {
    setForm((prev) => ({
      ...prev,
      exerciseIds: prev.exerciseIds.includes(id)
        ? prev.exerciseIds.filter((x) => x !== id)
        : [...prev.exerciseIds, id],
    }));
  };

  const onSave = async () => {
    const name = form.name.trim();
    if (!name) {
      toast.error("Name is required");
      return;
    }
    if (form.exerciseIds.length < WEEKLY_WORKOUT_TARGET) {
      toast.error(`Pick at least ${WEEKLY_WORKOUT_TARGET} exercises`);
      return;
    }
    const warmupMinutesTarget = Number(form.warmupMinutesTarget);
    const cardioMinutesTarget = Number(form.cardioMinutesTarget);
    const cardioCaloriesTarget = Number(form.cardioCaloriesTarget);
    if (
      !Number.isFinite(warmupMinutesTarget) ||
      !Number.isFinite(cardioMinutesTarget) ||
      !Number.isFinite(cardioCaloriesTarget)
    ) {
      toast.error("Targets must be numbers");
      return;
    }

    setSubmitting(true);
    try {
      const input = {
        name,
        exerciseIds: form.exerciseIds,
        warmupMinutesTarget,
        cardioMinutesTarget,
        cardioCaloriesTarget,
      };
      if (editing) {
        await editTemplate(editing.id, input);
        toast.success("Template updated");
      } else {
        await addTemplate(input);
        toast.success("Template created");
      }
      setModalOpen(false);
    } catch (err) {
      toast.error(toErrorMessage(err, "Save failed"));
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (tpl: GymTemplate) => {
    if (!window.confirm(`Delete “${tpl.name}”?`)) return;
    try {
      await removeTemplate(tpl.id);
      toast.success("Template deleted");
    } catch (err) {
      toast.error(toErrorMessage(err, "Delete failed"));
    }
  };

  const exerciseName = (id: string) =>
    exercises.find((e) => e.id === id)?.name ?? id;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Preset exercise sets with warm-up and cardio targets.
        </p>
        <Button onClick={openCreate} disabled={exercises.length === 0}>
          New
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-border bg-bg-elevated px-4 py-8 text-center text-sm text-muted">
          No templates yet. Create one from your exercise library.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {templates.map((tpl) => (
            <li
              key={tpl.id}
              className="rounded-[var(--radius)] border border-border bg-bg-elevated px-4 py-3"
            >
              <p className="font-medium text-foreground">{tpl.name}</p>
              <p className="mt-1 text-xs text-muted">
                {tpl.exerciseIds.map(exerciseName).join(" · ") || "No exercises"}
              </p>
              <p className="mt-1 text-xs text-faint">
                Warm-up {tpl.warmupMinutesTarget}m · Cardio{" "}
                {tpl.cardioMinutesTarget}m / {tpl.cardioCaloriesTarget} cal
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => openEdit(tpl)}
                >
                  <Pencil size={14} />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => void onDelete(tpl)}
                >
                  <Trash2 size={14} />
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={modalOpen}
        title={editing ? "Edit template" : "New template"}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={() => void onSave()} disabled={submitting}>
              {submitting ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <TextInput
            label="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Push day"
            autoFocus
          />

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-muted">
              Exercises ({form.exerciseIds.length} selected, min{" "}
              {WEEKLY_WORKOUT_TARGET})
            </legend>
            {exercises.length === 0 ? (
              <p className="text-xs text-faint">Add exercises first.</p>
            ) : (
              <>
                <ExerciseFilterBar
                  query={query}
                  onQueryChange={setQuery}
                  tag={tag}
                  onTagChange={setTag}
                  tags={allTags}
                  resultCount={filteredExercises.length}
                  totalCount={exercises.length}
                />
                <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto">
                  {filteredExercises.length === 0 ? (
                    <li className="px-2 py-1.5 text-xs text-faint">
                      No exercises match.
                    </li>
                  ) : (
                    filteredExercises.map((ex) => (
                      <li key={ex.id}>
                        <label className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-sm hover:bg-bg-overlay">
                          <input
                            type="checkbox"
                            checked={form.exerciseIds.includes(ex.id)}
                            onChange={() => toggleExercise(ex.id)}
                            className="accent-current"
                          />
                          <span className="min-w-0 flex-1 text-foreground">
                            {ex.name}
                            {ex.tags.length > 0 ? (
                              <span className="ml-1 text-xs text-faint">
                                ({ex.tags.join(", ")})
                              </span>
                            ) : null}
                          </span>
                        </label>
                      </li>
                    ))
                  )}
                </ul>
              </>
            )}
          </fieldset>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <TextInput
              label="Warm-up min"
              type="number"
              min={WARMUP_MINUTES_MIN}
              value={form.warmupMinutesTarget}
              onChange={(e) =>
                setForm((f) => ({ ...f, warmupMinutesTarget: e.target.value }))
              }
            />
            <TextInput
              label="Cardio min"
              type="number"
              min={CARDIO_MINUTES_MIN}
              value={form.cardioMinutesTarget}
              onChange={(e) =>
                setForm((f) => ({ ...f, cardioMinutesTarget: e.target.value }))
              }
            />
            <TextInput
              label="Cardio cal"
              type="number"
              min={1}
              value={form.cardioCaloriesTarget}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  cardioCaloriesTarget: e.target.value,
                }))
              }
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
