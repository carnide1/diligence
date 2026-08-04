"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Pencil, Trash2 } from "lucide-react";
import { useGym } from "@/contexts/GymContext";
import { toErrorMessage } from "@/lib/errors";
import { collectUniqueTags, filterExercises } from "@/lib/gymValidate";
import type { GymExercise } from "@/types/gym";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { TextInput } from "@/components/ui/TextInput";
import { ExerciseFilterBar } from "@/components/gym/ExerciseFilterBar";

function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export function GymExercisesPanel() {
  const { exercises, addExercise, editExercise, removeExercise } = useGym();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<GymExercise | null>(null);
  const [name, setName] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("");

  const allTags = useMemo(() => collectUniqueTags(exercises), [exercises]);
  const filtered = useMemo(
    () => filterExercises(exercises, { query, tag }),
    [exercises, query, tag],
  );

  const openCreate = () => {
    setEditing(null);
    setName("");
    setTagsRaw("");
    setModalOpen(true);
  };

  const openEdit = (ex: GymExercise) => {
    setEditing(ex);
    setName(ex.name);
    setTagsRaw(ex.tags.join(", "));
    setModalOpen(true);
  };

  const onSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Name is required");
      return;
    }
    setSubmitting(true);
    try {
      const input = { name: trimmed, tags: parseTags(tagsRaw) };
      if (editing) {
        await editExercise(editing.id, input);
        toast.success("Exercise updated");
      } else {
        await addExercise(input);
        toast.success("Exercise created");
      }
      setModalOpen(false);
    } catch (err) {
      toast.error(toErrorMessage(err, "Save failed"));
    } finally {
      setSubmitting(false);
    }
  };

  const onArchive = async (ex: GymExercise) => {
    if (!window.confirm(`Archive “${ex.name}”?`)) return;
    try {
      await removeExercise(ex.id);
      toast.success("Exercise archived");
    } catch (err) {
      toast.error(toErrorMessage(err, "Archive failed"));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Resistance library used in plans and templates.
        </p>
        <Button onClick={openCreate}>New</Button>
      </div>

      {exercises.length > 0 ? (
        <ExerciseFilterBar
          query={query}
          onQueryChange={setQuery}
          tag={tag}
          onTagChange={setTag}
          tags={allTags}
          resultCount={filtered.length}
          totalCount={exercises.length}
        />
      ) : null}

      {exercises.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-border bg-bg-elevated px-4 py-8 text-center text-sm text-muted">
          No exercises yet. Add one to build workouts.
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-border bg-bg-elevated px-4 py-8 text-center text-sm text-muted">
          No exercises match this search.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((ex) => (
            <li
              key={ex.id}
              className="rounded-[var(--radius)] border border-border bg-bg-elevated px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">{ex.name}</p>
                {ex.tags.length > 0 ? (
                  <p className="mt-1 text-xs text-muted">
                    {ex.tags.join(" · ")}
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-faint">
                  {ex.lastWeight != null &&
                  ex.lastSets != null &&
                  ex.lastReps != null
                    ? `Last ${ex.lastWeight} × ${ex.lastSets}×${ex.lastReps}`
                    : ex.lastWeight != null && ex.lastReps != null
                      ? `Last ${ex.lastWeight}×${ex.lastReps}`
                      : "No lifts yet"}
                  {" · "}
                  Used {ex.timesUsed}×
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => openEdit(ex)}
                >
                  <Pencil size={14} />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => void onArchive(ex)}
                >
                  <Trash2 size={14} />
                  Archive
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={modalOpen}
        title={editing ? "Edit exercise" : "New exercise"}
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
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Bench press"
            autoFocus
          />
          <TextInput
            label="Tags"
            value={tagsRaw}
            onChange={(e) => setTagsRaw(e.target.value)}
            placeholder="chest, push (comma-separated)"
          />
        </div>
      </Modal>
    </div>
  );
}
