import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  collapseSets,
  emptySetGroup,
  expandSetGroups,
} from "./gymSetGroups";

describe("collapseSets", () => {
  it("collapses consecutive identical sets into a count", () => {
    const groups = collapseSets([
      { weight: 135, reps: 8 },
      { weight: 135, reps: 8 },
      { weight: 135, reps: 8 },
      { weight: 145, reps: 5 },
      { weight: 145, reps: 5 },
    ]);
    assert.deepEqual(groups, [
      { weight: "135", reps: "8", times: "3" },
      { weight: "145", reps: "5", times: "2" },
    ]);
  });

  it("returns an empty group when there are no sets", () => {
    assert.deepEqual(collapseSets([]), [emptySetGroup()]);
  });
});

describe("expandSetGroups", () => {
  it("expands count into individual sets", () => {
    const result = expandSetGroups(
      [{ weight: "135", reps: "8", times: "3" }],
      "external",
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.sets, [
      { weight: 135, reps: 8 },
      { weight: 135, reps: 8 },
      { weight: 135, reps: 8 },
    ]);
  });

  it("rejects fractional set counts", () => {
    const result = expandSetGroups(
      [{ weight: "100", reps: "10", times: "2.5" }],
      "external",
    );
    assert.equal(result.ok, false);
  });

  it("round-trips with collapseSets", () => {
    const original = [
      { weight: 95, reps: 12 },
      { weight: 95, reps: 12 },
      { weight: 100, reps: 8 },
    ];
    const expanded = expandSetGroups(collapseSets(original), "external");
    assert.equal(expanded.ok, true);
    if (!expanded.ok) return;
    assert.deepEqual(expanded.sets, original);
  });
});
