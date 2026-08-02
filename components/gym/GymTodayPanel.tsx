"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Trash2 } from "lucide-react";
import { useGym } from "@/contexts/GymContext";
import { toErrorMessage } from "@/lib/errors";
import {
  CARDIO_MINUTES_MIN,
  WARMUP_MINUTES_MIN,
  WEEKLY_WORKOUT_TARGET,
  type GymLiftEntry,
  type GymSession,
} from "@/types/gym";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";

type LiftDraft = {
  exerciseId: string;
  weight: string;
  reps: string;
};

type CardioDraft = {
  minutes: string;
  calories: string;
};

function emptyLift(): LiftDraft {
  return { exerciseId: "", weight: "", reps: "" };
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
  return source.map((l) => ({
    exerciseId: l.exerciseId,
    weight: String(l.weight),
    reps: String(l.reps),
  }));
}

function cardioFromBlock(
  block: { minutes: number; calories: number } | null | undefined,
  fallbackMinutes: number,
): CardioDraft {
  if (block) {
    return {
      minutes: String(block.minutes),
      calories: String(block.calories),
    };
  }
  return { minutes: String(fallbackMinutes), calories: "" };
}

function parseLifts(drafts: LiftDraft[]): GymLiftEntry[] | null {
  const lifts: GymLiftEntry[] = [];
  for (const d of drafts) {
    if (!d.exerciseId) {
      toast.error("Every row needs an exercise");
      return null;
    }
    const weight = Number(d.weight);
    const reps = Number(d.reps);
    if (!Number.isFinite(weight) || weight < 0) {
      toast.error("Every lift needs a non-negative weight");
      return null;
    }
    if (!Number.isFinite(reps) || reps <= 0) {
      toast.error("Every lift needs reps greater than zero");
      return null;
    }
    lifts.push({ exerciseId: d.exerciseId, weight, reps });
  }
  return lifts;
}

function parseCardio(
  draft: CardioDraft,
  label: string,
): { minutes: number; calories: number } | null {
  const minutes = Number(draft.minutes);
  const calories = Number(draft.calories);
  if (!Number.isFinite(minutes) || !Number.isFinite(calories)) {
    toast.error(`${label} needs numeric minutes and calories`);
    return null;
  }
  return { minutes, calories };
}

export function GymTodayPanel() {
  const {
    exercises,
    templates,
    todaySession,
    planToday,
    completeToday,
  } = useGym();

  const status = todaySession?.status;
  const showPlan = !todaySession || status === "rejected";
  const showComplete = status === "planned" || status === "rejected";
  const showSuccess = status === "accepted";

  const [templateId, setTemplateId] = useState("");
  const [planLifts, setPlanLifts] = useState<LiftDraft[]>(() =>
    Array.from({ length: WEEKLY_WORKOUT_TARGET }, emptyLift),
  );
  const [planWarmup, setPlanWarmup] = useState<CardioDraft>({
    minutes: String(WARMUP_MINUTES_MIN),
    calories: "",
  });
  const [planCardio, setPlanCardio] = useState<CardioDraft>({
    minutes: String(CARDIO_MINUTES_MIN),
    calories: "",
  });
  const [completeLifts, setCompleteLifts] = useState<LiftDraft[]>([]);
  const [completeWarmup, setCompleteWarmup] = useState<CardioDraft>({
    minutes: String(WARMUP_MINUTES_MIN),
    calories: "",
  });
  const [completeCardio, setCompleteCardio] = useState<CardioDraft>({
    minutes: String(CARDIO_MINUTES_MIN),
    calories: "",
  });
  const [savingPlan, setSavingPlan] = useState(false);
  const [savingComplete, setSavingComplete] = useState(false);

  const exerciseOptions = useMemo(
    () => exercises.map((e) => ({ id: e.id, name: e.name })),
    [exercises],
  );

  const exerciseById = useMemo(
    () => Object.fromEntries(exercises.map((e) => [e.id, e])),
    [exercises],
  );

  // Seed complete form when session is planned/rejected
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

  // When rejected, also seed plan form from last plan
  useEffect(() => {
    if (!todaySession || todaySession.status !== "rejected") return;
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
  }, [todaySession]);

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    if (!id) return;
    const tpl = templates.find((t) => t.id === id);
    if (!tpl) return;
    setPlanLifts(
      tpl.exerciseIds.map((exerciseId) => {
        const ex = exerciseById[exerciseId];
        return {
          exerciseId,
          weight: ex?.lastWeight != null ? String(ex.lastWeight) : "",
          reps: ex?.lastReps != null ? String(ex.lastReps) : "",
        };
      }),
    );
    setPlanWarmup((w) => ({
      ...w,
      minutes: String(tpl.warmupMinutesTarget),
    }));
    setPlanCardio({
      minutes: String(tpl.cardioMinutesTarget),
      calories: String(tpl.cardioCaloriesTarget),
    });
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
    const ex = exerciseById[exerciseId];
    updateLift(list, setList, index, {
      exerciseId,
      weight:
        ex?.lastWeight != null
          ? String(ex.lastWeight)
          : list[index]?.weight ?? "",
      reps:
        ex?.lastReps != null ? String(ex.lastReps) : list[index]?.reps ?? "",
    });
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
      toast.success("Plan saved");
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

      {showPlan ? (
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="font-display text-lg text-foreground">
              {status === "rejected" ? "Revise plan" : "Plan today"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              At least {WEEKLY_WORKOUT_TARGET} resistance lifts, warm-up, and
              cardio.
            </p>
          </div>

          {templates.length > 0 ? (
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-muted">Template (optional)</span>
              <select
                value={templateId}
                onChange={(e) => applyTemplate(e.target.value)}
                className="h-10 rounded-[var(--radius-sm)] border border-border bg-bg-elevated px-3 text-foreground"
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

          <Button onClick={() => void onSubmitPlan()} disabled={savingPlan}>
            {savingPlan ? "Saving…" : "Save plan"}
          </Button>
        </section>
      ) : null}

      {showComplete ? (
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="font-display text-lg text-foreground">
              Complete workout
            </h2>
            <p className="mt-1 text-sm text-muted">
              Log actuals. Weight must meet or beat your last accepted lift.
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
            className="rounded-[var(--radius)] border border-border bg-bg-elevated p-3"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm">
                <span className="font-medium text-muted">Exercise</span>
                <select
                  value={row.exerciseId}
                  onChange={(e) => onChangeExercise(index, e.target.value)}
                  className="h-10 rounded-[var(--radius-sm)] border border-border bg-bg px-3 text-foreground"
                >
                  <option value="">Select…</option>
                  {options.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </label>
              <TextInput
                label="Weight"
                type="number"
                min={0}
                step="any"
                value={row.weight}
                onChange={(e) =>
                  onChangeField(index, { weight: e.target.value })
                }
                className="w-full sm:w-24"
              />
              <TextInput
                label="Reps"
                type="number"
                min={1}
                value={row.reps}
                onChange={(e) => onChangeField(index, { reps: e.target.value })}
                className="w-full sm:w-20"
              />
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0"
                onClick={() => onRemove(index)}
                disabled={lifts.length <= WEEKLY_WORKOUT_TARGET}
                aria-label="Remove exercise"
              >
                <Trash2 size={14} />
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
    <div className="grid grid-cols-2 gap-3">
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
