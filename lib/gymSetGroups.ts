import type { GymSet } from "@/types/gym";

export type SetGroupDraft = {
  weight: string;
  reps: string;
  times: string;
};

export function emptySetGroup(): SetGroupDraft {
  return { weight: "", reps: "", times: "1" };
}

/** Collapse consecutive identical sets into weight × reps × count rows. */
export function collapseSets(sets: GymSet[]): SetGroupDraft[] {
  const groups: SetGroupDraft[] = [];
  for (const s of sets) {
    const weight = String(s.weight);
    const reps = String(s.reps);
    const last = groups[groups.length - 1];
    if (last && last.weight === weight && last.reps === reps) {
      last.times = String(Number(last.times) + 1);
    } else {
      groups.push({ weight, reps, times: "1" });
    }
  }
  return groups.length ? groups : [emptySetGroup()];
}

export type ExpandSetGroupResult =
  | { ok: true; sets: GymSet[] }
  | { ok: false; reason: string };

/** Expand UI rows (weight × reps × count) into individual GymSet entries. */
export function expandSetGroups(
  groups: SetGroupDraft[],
  loadType: "external" | "bodyweight",
): ExpandSetGroupResult {
  if (!groups.length) {
    return { ok: false, reason: "Every lift needs at least one set" };
  }
  const sets: GymSet[] = [];
  for (const s of groups) {
    const reps = Number(s.reps);
    const times = Number(s.times);
    if (!Number.isFinite(reps) || reps <= 0) {
      return { ok: false, reason: "Every set needs reps greater than zero" };
    }
    if (!Number.isFinite(times) || times < 1 || !Number.isInteger(times)) {
      return {
        ok: false,
        reason: "Set count must be a whole number of at least 1",
      };
    }
    if (loadType === "bodyweight") {
      for (let i = 0; i < times; i += 1) {
        sets.push({ weight: 0, reps });
      }
      continue;
    }
    const weight = Number(s.weight);
    if (!Number.isFinite(weight) || weight < 0) {
      return {
        ok: false,
        reason: "Every set needs a non-negative weight in lb",
      };
    }
    for (let i = 0; i < times; i += 1) {
      sets.push({ weight, reps });
    }
  }
  return { ok: true, sets };
}
