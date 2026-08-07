"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useGym } from "@/contexts/GymContext";
import { toErrorMessage } from "@/lib/errors";
import {
  CARDIO_MINUTES_MIN,
  WARMUP_MINUTES_MIN,
  WEEKLY_WORKOUT_TARGET,
  type GymExercise,
  type GymLiftEntry,
  type GymLoadType,
  type GymSession,
} from "@/types/gym";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { FORM_SELECT_CLASS } from "@/components/ui/formStyles";
import {
  collapseSets,
  emptySetGroup,
  expandSetGroups,
  type SetGroupDraft,
} from "@/lib/gymSetGroups";

type LiftDraft = {
  exerciseId: string;
  loadType: GymLoadType;
  sets: SetGroupDraft[];
};

type CardioDraft = {
  minutes: string;
  calories: string;
  machine: string;
};

function emptyLift(): LiftDraft {
  return { exerciseId: "", loadType: "external", sets: [emptySetGroup()] };
}

function setsFromExercise(ex: GymExercise | undefined): SetGroupDraft[] {
  if (ex?.lastSetPerformance?.length) {
    return collapseSets(ex.lastSetPerformance);
  }
  if (ex?.lastWeight != null && ex.lastReps != null) {
    const count = ex.lastSets && ex.lastSets > 0 ? ex.lastSets : 1;
    return [
      {
        weight: String(ex.lastWeight),
        reps: String(ex.lastReps),
        times: String(count),
      },
    ];
  }
  return [emptySetGroup()];
}

function liftToDraft(l: GymLiftEntry): LiftDraft {
  return {
    exerciseId: l.exerciseId,
    loadType: l.loadType,
    sets: collapseSets(l.sets),
  };
}

function liftsFromSession(
  session: GymSession,
  preferActual: boolean,
): LiftDraft[] {
  const source =
    preferActual && session.actualExercises?.length
      ? session.actualExercises
      : session.plannedExercises;
  if (!source.length) {
    return Array.from({ length: WEEKLY_WORKOUT_TARGET }, emptyLift);
  }
  return source.map(liftToDraft);
}

function cardioFromBlock(
  block:
    | { minutes: number; calories: number; machine?: string }
    | null
    | undefined,
  fallbackMinutes: number,
): CardioDraft {
  if (block) {
    return {
      minutes: String(block.minutes),
      calories: String(block.calories),
      machine: block.machine ?? "",
    };
  }
  return { minutes: String(fallbackMinutes), calories: "", machine: "" };
}

function parseLifts(drafts: LiftDraft[]): GymLiftEntry[] | null {
  const lifts: GymLiftEntry[] = [];
  for (const d of drafts) {
    if (!d.exerciseId) {
      toast.error("Every row needs an exercise");
      return null;
    }
    const expanded = expandSetGroups(d.sets, d.loadType);
    if (!expanded.ok) {
      toast.error(expanded.reason);
      return null;
    }
    lifts.push({
      exerciseId: d.exerciseId,
      loadType: d.loadType,
      sets: expanded.sets,
    });
  }
  return lifts;
}

function parseCardio(
  draft: CardioDraft,
  label: string,
): { minutes: number; calories: number; machine: string } | null {
  const minutes = Number(draft.minutes);
  const calories = Number(draft.calories);
  const machine = draft.machine.trim();
  if (!Number.isFinite(minutes) || !Number.isFinite(calories)) {
    toast.error(`${label} needs numeric minutes and calories`);
    return null;
  }
  if (!machine) {
    toast.error(`${label} needs a machine name`);
    return null;
  }
  return { minutes, calories, machine };
}

export function GymTodayPanel() {
  const { exercises, templates, todaySession, planToday, completeToday } =
    useGym();

  const status = todaySession?.status;
  const [editingPlan, setEditingPlan] = useState(false);
  const showPlan =
    !todaySession ||
    status === "rejected" ||
    (status === "planned" && editingPlan);
  const showComplete =
    (status === "planned" && !editingPlan) || status === "rejected";
  const showSuccess = status === "accepted";

  const [templateId, setTemplateId] = useState("");
  const [planLifts, setPlanLifts] = useState<LiftDraft[]>(() =>
    Array.from({ length: WEEKLY_WORKOUT_TARGET }, emptyLift),
  );
  const [planWarmup, setPlanWarmup] = useState<CardioDraft>({
    minutes: String(WARMUP_MINUTES_MIN),
    calories: "",
    machine: "",
  });
  const [planCardio, setPlanCardio] = useState<CardioDraft>({
    minutes: String(CARDIO_MINUTES_MIN),
    calories: "",
    machine: "",
  });
  const [completeLifts, setCompleteLifts] = useState<LiftDraft[]>([]);
  const [completeWarmup, setCompleteWarmup] = useState<CardioDraft>({
    minutes: String(WARMUP_MINUTES_MIN),
    calories: "",
    machine: "",
  });
  const [completeCardio, setCompleteCardio] = useState<CardioDraft>({
    minutes: String(CARDIO_MINUTES_MIN),
    calories: "",
    machine: "",
  });
  const [savingPlan, setSavingPlan] = useState(false);
  const [savingComplete, setSavingComplete] = useState(false);

  const exerciseOptions = useMemo(
    () =>
      exercises.map((e) => ({
        id: e.id,
        name: e.location ? `${e.name} (${e.location})` : e.name,
      })),
    [exercises],
  );

  const exerciseById = useMemo(
    () => Object.fromEntries(exercises.map((e) => [e.id, e])),
    [exercises],
  );

  useEffect(() => {
    if (!todaySession) return;
    if (todaySession.status !== "planned" && todaySession.status !== "rejected") {
      return;
    }
    const preferActual = todaySession.status === "rejected";
    const timer = setTimeout(() => {
      setCompleteLifts(liftsFromSession(todaySession, preferActual));
      setCompleteWarmup(
        cardioFromBlock(
          preferActual && todaySession.actualWarmup
            ? todaySession.actualWarmup
            : todaySession.plannedWarmup,
          WARMUP_MINUTES_MIN,
        ),
      );
      setCompleteCardio(
        cardioFromBlock(
          preferActual && todaySession.actualCardio
            ? todaySession.actualCardio
            : todaySession.plannedCardio,
          CARDIO_MINUTES_MIN,
        ),
      );
    }, 0);
    return () => clearTimeout(timer);
  }, [todaySession]);

  useEffect(() => {
    if (!todaySession) return;
    if (todaySession.status !== "rejected" && todaySession.status !== "planned")
      return;
    if (todaySession.status === "planned" && !editingPlan) return;
    const timer = setTimeout(() => {
      setPlanLifts(liftsFromSession(todaySession, false));
      setPlanWarmup(
        cardioFromBlock(todaySession.plannedWarmup, WARMUP_MINUTES_MIN),
      );
      setPlanCardio(
        cardioFromBlock(todaySession.plannedCardio, CARDIO_MINUTES_MIN),
      );
      setTemplateId(todaySession.templateId ?? "");
    }, 0);
    return () => clearTimeout(timer);
  }, [todaySession, editingPlan]);

  const startEditPlan = () => {
    if (!todaySession) return;
    setPlanLifts(liftsFromSession(todaySession, false));
    setPlanWarmup(
      cardioFromBlock(todaySession.plannedWarmup, WARMUP_MINUTES_MIN),
    );
    setPlanCardio(
      cardioFromBlock(todaySession.plannedCardio, CARDIO_MINUTES_MIN),
    );
    setTemplateId(todaySession.templateId ?? "");
    setEditingPlan(true);
  };

  const draftFromExercise = (exerciseId: string): LiftDraft => {
    const ex = exerciseById[exerciseId];
    return {
      exerciseId,
      loadType: ex?.loadType ?? "external",
      sets: setsFromExercise(ex),
    };
  };

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    if (!id) return;
    const tpl = templates.find((t) => t.id === id);
    if (!tpl) return;
    setPlanLifts(tpl.exerciseIds.map((exerciseId) => draftFromExercise(exerciseId)));
    setPlanWarmup((w) => ({
      ...w,
      minutes: String(tpl.warmupMinutesTarget),
    }));
    setPlanCardio((c) => ({
      ...c,
      minutes: String(tpl.cardioMinutesTarget),
      calories: String(tpl.cardioCaloriesTarget),
    }));
  };

  const updateLift = (
    list: LiftDraft[],
    setList: (next: LiftDraft[]) => void,
    index: number,
    patch: Partial<LiftDraft>,
  ) => {
    setList(list.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const onSelectExercise = (
    list: LiftDraft[],
    setList: (next: LiftDraft[]) => void,
    index: number,
    exerciseId: string,
  ) => {
    if (!exerciseId) {
      updateLift(list, setList, index, emptyLift());
      return;
    }
    updateLift(list, setList, index, draftFromExercise(exerciseId));
  };

  const onSubmitPlan = async () => {
    if (planLifts.length < WEEKLY_WORKOUT_TARGET) {
      toast.error(`Add at least ${WEEKLY_WORKOUT_TARGET} exercises`);
      return;
    }
    const lifts = parseLifts(planLifts);
    if (!lifts) return;
    const warmup = parseCardio(planWarmup, "Warm-up");
    if (!warmup) return;
    const cardio = parseCardio(planCardio, "Cardio");
    if (!cardio) return;

    setSavingPlan(true);
    try {
      await planToday({
        templateId: templateId || null,
        exercises: lifts,
        warmup,
        cardio,
      });
      toast.success(editingPlan ? "Plan updated" : "Plan saved");
      setEditingPlan(false);
    } catch (err) {
      toast.error(toErrorMessage(err, "Could not save plan"));
    } finally {
      setSavingPlan(false);
    }
  };

  const onSubmitComplete = async () => {
    if (completeLifts.length < WEEKLY_WORKOUT_TARGET) {
      toast.error(`Need at least ${WEEKLY_WORKOUT_TARGET} exercises`);
      return;
    }
    const lifts = parseLifts(completeLifts);
    if (!lifts) return;
    const warmup = parseCardio(completeWarmup, "Warm-up");
    if (!warmup) return;
    const cardio = parseCardio(completeCardio, "Cardio");
    if (!cardio) return;

    setSavingComplete(true);
    try {
      const result = await completeToday({
        exercises: lifts,
        warmup,
        cardio,
      });
      if (result.status === "accepted") {
        toast.success("Workout accepted");
      } else {
        toast.error(
          result.rejectReasons[0] ?? "Workout rejected — check the rules",
        );
      }
    } catch (err) {
      toast.error(toErrorMessage(err, "Could not complete workout"));
    } finally {
      setSavingComplete(false);
    }
  };

  if (exercises.length === 0) {
    return (
      <div className="rounded-[var(--radius)] border border-border bg-bg-elevated px-4 py-8 text-center text-sm text-muted">
        Add exercises in the Exercises tab before planning a workout.
      </div>
    );
  }

  if (showSuccess && todaySession) {
    return (
      <div className="rounded-[var(--radius)] border border-border bg-bg-elevated px-4 py-8 text-center">
        <p className="font-display text-xl text-foreground">Workout complete</p>
        <p className="mt-2 text-sm text-muted">
          Today&apos;s session was accepted —{" "}
          {todaySession.actualExercises?.length ??
            todaySession.plannedExercises.length}{" "}
          lifts logged.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {status === "rejected" && todaySession?.rejectReasons.length ? (
        <div className="rounded-[var(--radius)] border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger">
          <p className="font-medium">Rejected</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {todaySession.rejectReasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {status === "planned" && !editingPlan ? (
        <div className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-border bg-bg-elevated px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">Plan saved</p>
            <p className="text-xs text-muted">
              Log actuals below, or edit the plan first.
            </p>
          </div>
          <Button size="sm" variant="secondary" onClick={startEditPlan}>
            <Pencil size={14} />
            Edit plan
          </Button>
        </div>
      ) : null}

      {showPlan ? (
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="font-display text-lg text-foreground">
              {editingPlan
                ? "Edit plan"
                : status === "rejected"
                  ? "Revise plan"
                  : "Plan today"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              At least {WEEKLY_WORKOUT_TARGET} resistance lifts. Enter matching
              sets as weight × reps × count on one row.
            </p>
          </div>

          {templates.length > 0 ? (
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-muted">Template (optional)</span>
              <select
                value={templateId}
                onChange={(e) => applyTemplate(e.target.value)}
                className={FORM_SELECT_CLASS}
              >
                <option value="">None</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <LiftEditor
            lifts={planLifts}
            options={exerciseOptions}
            onChangeExercise={(i, id) =>
              onSelectExercise(planLifts, setPlanLifts, i, id)
            }
            onChangeField={(i, patch) =>
              updateLift(planLifts, setPlanLifts, i, patch)
            }
            onAdd={() => setPlanLifts((rows) => [...rows, emptyLift()])}
            onRemove={(i) =>
              setPlanLifts((rows) =>
                rows.length <= WEEKLY_WORKOUT_TARGET
                  ? rows
                  : rows.filter((_, idx) => idx !== i),
              )
            }
          />

          <CardioFields
            label="Warm-up"
            value={planWarmup}
            onChange={setPlanWarmup}
            minMinutes={WARMUP_MINUTES_MIN}
          />
          <CardioFields
            label="Cardio"
            value={planCardio}
            onChange={setPlanCardio}
            minMinutes={CARDIO_MINUTES_MIN}
          />

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void onSubmitPlan()} disabled={savingPlan}>
              {savingPlan
                ? "Saving…"
                : editingPlan
                  ? "Update plan"
                  : "Save plan"}
            </Button>
            {editingPlan ? (
              <Button
                variant="ghost"
                disabled={savingPlan}
                onClick={() => setEditingPlan(false)}
              >
                Cancel edit
              </Button>
            ) : null}
          </div>
        </section>
      ) : null}

      {showComplete ? (
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="font-display text-lg text-foreground">
              Complete workout
            </h2>
            <p className="mt-1 text-sm text-muted">
              Log actuals. External lifts need volume (Σ lb×reps) ≥ last
              accepted.
            </p>
          </div>

          <LiftEditor
            lifts={completeLifts}
            options={exerciseOptions}
            onChangeExercise={(i, id) =>
              onSelectExercise(completeLifts, setCompleteLifts, i, id)
            }
            onChangeField={(i, patch) =>
              updateLift(completeLifts, setCompleteLifts, i, patch)
            }
            onAdd={() => setCompleteLifts((rows) => [...rows, emptyLift()])}
            onRemove={(i) =>
              setCompleteLifts((rows) =>
                rows.length <= WEEKLY_WORKOUT_TARGET
                  ? rows
                  : rows.filter((_, idx) => idx !== i),
              )
            }
          />

          <CardioFields
            label="Warm-up"
            value={completeWarmup}
            onChange={setCompleteWarmup}
            minMinutes={WARMUP_MINUTES_MIN}
          />
          <CardioFields
            label="Cardio"
            value={completeCardio}
            onChange={setCompleteCardio}
            minMinutes={CARDIO_MINUTES_MIN}
          />

          <Button
            onClick={() => void onSubmitComplete()}
            disabled={savingComplete}
          >
            {savingComplete ? "Submitting…" : "Submit workout"}
          </Button>
        </section>
      ) : null}
    </div>
  );
}

function LiftEditor({
  lifts,
  options,
  onChangeExercise,
  onChangeField,
  onAdd,
  onRemove,
}: {
  lifts: LiftDraft[];
  options: { id: string; name: string }[];
  onChangeExercise: (index: number, exerciseId: string) => void;
  onChangeField: (index: number, patch: Partial<LiftDraft>) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  const updateSetGroup = (
    liftIndex: number,
    setIndex: number,
    patch: Partial<SetGroupDraft>,
  ) => {
    const row = lifts[liftIndex];
    if (!row) return;
    const sets = row.sets.map((s, i) =>
      i === setIndex ? { ...s, ...patch } : s,
    );
    onChangeField(liftIndex, { sets });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted">
          Exercises ({lifts.length})
        </p>
        <Button size="sm" variant="secondary" onClick={onAdd}>
          <Plus size={14} />
          Add
        </Button>
      </div>
      <ul className="flex flex-col gap-3">
        {lifts.map((row, index) => (
          <li
            key={`${index}-${row.exerciseId || "empty"}`}
            className="min-w-0 overflow-hidden rounded-[var(--radius)] border border-border bg-bg-elevated p-3"
          >
            <div className="flex min-w-0 flex-col gap-3">
              <label className="flex min-w-0 flex-col gap-1.5 text-sm">
                <span className="font-medium text-muted">Exercise</span>
                <select
                  value={row.exerciseId}
                  onChange={(e) => onChangeExercise(index, e.target.value)}
                  className={FORM_SELECT_CLASS}
                >
                  <option value="">Select…</option>
                  {options.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex min-w-0 flex-col gap-1.5 text-sm">
                <span className="font-medium text-muted">Load</span>
                <select
                  value={row.loadType}
                  onChange={(e) =>
                    onChangeField(index, {
                      loadType: e.target.value as GymLoadType,
                    })
                  }
                  className={FORM_SELECT_CLASS}
                >
                  <option value="external">Barbell / machine (lb)</option>
                  <option value="bodyweight">Bodyweight</option>
                </select>
              </label>

              <div className="flex min-w-0 flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-muted">
                    Sets{" "}
                    <span className="font-normal text-faint">
                      (weight × reps × count)
                    </span>
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      onChangeField(index, {
                        sets: [...row.sets, emptySetGroup()],
                      })
                    }
                  >
                    <Plus size={14} />
                    Row
                  </Button>
                </div>
                {row.sets.map((set, setIndex) => (
                  <div
                    key={setIndex}
                    className={
                      row.loadType === "external"
                        ? "grid min-w-0 grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.85fr)_auto] items-end gap-2"
                        : "grid min-w-0 grid-cols-[auto_minmax(0,1fr)_minmax(0,0.85fr)_auto] items-end gap-2"
                    }
                  >
                    {row.loadType === "external" ? (
                      <TextInput
                        label={setIndex === 0 ? "Weight" : undefined}
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="any"
                        value={set.weight}
                        onChange={(e) =>
                          updateSetGroup(index, setIndex, {
                            weight: e.target.value,
                          })
                        }
                        aria-label={`Row ${setIndex + 1} weight`}
                      />
                    ) : (
                      <div
                        className={[
                          "flex h-10 items-center text-sm text-muted",
                          setIndex === 0 ? "mt-6" : "",
                        ].join(" ")}
                      >
                        BW
                      </div>
                    )}
                    <TextInput
                      label={setIndex === 0 ? "Reps" : undefined}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      value={set.reps}
                      onChange={(e) =>
                        updateSetGroup(index, setIndex, {
                          reps: e.target.value,
                        })
                      }
                      aria-label={`Row ${setIndex + 1} reps`}
                    />
                    <TextInput
                      label={setIndex === 0 ? "× Sets" : undefined}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      step={1}
                      value={set.times}
                      onChange={(e) =>
                        updateSetGroup(index, setIndex, {
                          times: e.target.value,
                        })
                      }
                      aria-label={`Row ${setIndex + 1} set count`}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0 px-2"
                      onClick={() =>
                        onChangeField(index, {
                          sets:
                            row.sets.length <= 1
                              ? row.sets
                              : row.sets.filter((_, i) => i !== setIndex),
                        })
                      }
                      disabled={row.sets.length <= 1}
                      aria-label={`Remove set row ${setIndex + 1}`}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                size="sm"
                variant="ghost"
                className="self-start"
                onClick={() => onRemove(index)}
                disabled={lifts.length <= WEEKLY_WORKOUT_TARGET}
                aria-label="Remove exercise"
              >
                <Trash2 size={14} />
                Remove
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CardioFields({
  label,
  value,
  onChange,
  minMinutes,
}: {
  label: string;
  value: CardioDraft;
  onChange: (next: CardioDraft) => void;
  minMinutes: number;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <TextInput
        label={`${label} machine`}
        value={value.machine}
        onChange={(e) => onChange({ ...value, machine: e.target.value })}
        placeholder="e.g. treadmill"
      />
      <TextInput
        label={`${label} minutes (min ${minMinutes})`}
        type="number"
        min={minMinutes}
        value={value.minutes}
        onChange={(e) => onChange({ ...value, minutes: e.target.value })}
      />
      <TextInput
        label={`${label} calories`}
        type="number"
        min={1}
        value={value.calories}
        onChange={(e) => onChange({ ...value, calories: e.target.value })}
      />
    </div>
  );
}
