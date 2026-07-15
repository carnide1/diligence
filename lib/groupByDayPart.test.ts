import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { groupByDayPart } from "./groupByDayPart";

describe("groupByDayPart", () => {
  it("orders by day part and skips empties", () => {
    const groups = groupByDayPart([
      { id: "1", dayPart: "evening" as const },
      { id: "2", dayPart: "dawning" as const },
      { id: "3", dayPart: "evening" as const },
    ]);
    assert.deepEqual(
      groups.map((g) => g.key),
      ["dawning", "evening"],
    );
    assert.equal(groups[0].items.length, 1);
    assert.equal(groups[1].items.length, 2);
  });
});
