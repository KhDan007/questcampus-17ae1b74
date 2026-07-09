import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildAgentCockpitModel, savedUniversitiesToBackendTargets } from "./cockpitModel";

describe("agent cockpit model", () => {
  it("uses the current saved target list instead of stale roadmap targets", () => {
    const model = buildAgentCockpitModel({
      savedTargets: [{ system: "scorecard", externalId: "new", name: "New University" }],
      roadmap: {
        savedTargetPlans: [
          {
            targetId: "scorecard:old",
            system: "scorecard",
            externalId: "old",
            name: "Old University",
            ready: true,
          },
        ],
      },
      checklist: {
        ready: false,
        perTarget: [
          {
            system: "scorecard",
            externalId: "new",
            found: true,
            checklist: {
              ready: false,
              requiredTotal: 3,
              requiredSatisfied: 1,
              blocking: 2,
            },
          },
        ],
      } as never,
    });

    assert.deepEqual(
      model.targetPlans.map((target) => target.targetId),
      ["scorecard:new"],
    );
    assert.equal(model.targetPlans[0]?.name, "New University");
    assert.equal(model.blockedCount, 1);
  });

  it("preserves roadmap detail for currently saved targets", () => {
    const model = buildAgentCockpitModel({
      savedTargets: [{ system: "scorecard", externalId: "saved", name: "Saved University" }],
      roadmap: {
        savedTargetPlans: [
          {
            targetId: "scorecard:saved",
            system: "scorecard",
            externalId: "saved",
            name: "Saved University",
            ready: true,
            coverage: "full",
            nextActions: [{ id: "essay", label: "Draft essay", kind: "essay" }],
          },
        ],
      },
    });

    assert.equal(model.targetPlans[0]?.ready, true);
    assert.equal(model.targetPlans[0]?.coverage, "full");
    assert.equal(model.targetPlans[0]?.nextActions?.[0]?.label, "Draft essay");
  });

  it("converts saved universities to backend targets without referral or language fields", () => {
    const targets = savedUniversitiesToBackendTargets([
      {
        id: "row",
        source: "scorecard",
        externalId: "123",
        name: "Quest U",
      },
    ] as never);

    assert.deepEqual(targets, [{ system: "scorecard", externalId: "123", name: "Quest U" }]);
  });
});
