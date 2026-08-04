import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { describeActiveRange, isWithinActiveRange } from "./activeRange";

describe("activeRange", () => {
  it("treats null bounds as open-ended", () => {
    assert.equal(isWithinActiveRange("2026-07-14", null, null), true);
    assert.equal(isWithinActiveRange("2026-07-14", "2026-07-10", null), true);
    assert.equal(isWithinActiveRange("2026-07-14", null, "2026-07-20"), true);
  });

  it("excludes dates outside the inclusive window", () => {
    assert.equal(
      isWithinActiveRange("2026-07-09", "2026-07-10", "2026-07-16"),
      false,
    );
    assert.equal(
      isWithinActiveRange("2026-07-17", "2026-07-10", "2026-07-16"),
      false,
    );
    assert.equal(
      isWithinActiveRange("2026-07-10", "2026-07-10", "2026-07-16"),
      true,
    );
    assert.equal(
      isWithinActiveRange("2026-07-16", "2026-07-10", "2026-07-16"),
      true,
    );
  });

  it("describes ranges for list meta", () => {
    assert.equal(describeActiveRange(null, null), null);
    assert.equal(
      describeActiveRange("2026-07-10", "2026-07-16"),
      "2026-07-10 → 2026-07-16",
    );
  });
});
