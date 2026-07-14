import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_DAY_PERIODS,
  adjustPeriodEnd,
  adjustPeriodStart,
  periodDurationMinutes,
  validateDayPeriods,
} from "./dayPeriods";

describe("dayPeriods", () => {
  it("defaults cover a full contiguous day", () => {
    assert.equal(validateDayPeriods(DEFAULT_DAY_PERIODS), null);
    const total = DEFAULT_DAY_PERIODS.reduce(
      (sum, p) => sum + periodDurationMinutes(p),
      0,
    );
    assert.equal(total, 24 * 60);
  });

  it("snaps Night start when Evening end changes", () => {
    const result = adjustPeriodEnd(DEFAULT_DAY_PERIODS, "evening", 22 * 60);
    assert.ok(!("error" in result));
    if ("error" in result) return;
    const evening = result.find((p) => p.key === "evening")!;
    const night = result.find((p) => p.key === "night")!;
    assert.equal(evening.endMinutes, 22 * 60);
    assert.equal(night.startMinutes, 22 * 60);
    assert.equal(validateDayPeriods(result), null);
  });

  it("snaps previous end when Morning start changes", () => {
    const result = adjustPeriodStart(DEFAULT_DAY_PERIODS, "morning", 8 * 60);
    assert.ok(!("error" in result));
    if ("error" in result) return;
    const dawning = result.find((p) => p.key === "dawning")!;
    const morning = result.find((p) => p.key === "morning")!;
    assert.equal(morning.startMinutes, 8 * 60);
    assert.equal(dawning.endMinutes, 8 * 60);
    assert.equal(validateDayPeriods(result), null);
  });

  it("rejects collapsing a period to zero duration", () => {
    const result = adjustPeriodEnd(DEFAULT_DAY_PERIODS, "noon", 12 * 60);
    assert.ok("error" in result);
  });
});
