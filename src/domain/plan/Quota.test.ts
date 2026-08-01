import { describe, expect, test } from "vitest";
import { checkQuota, checkScoutView } from "./Quota";
import { PLANS } from "./Plan";
import { emptyUsage } from "./Usage";

describe("checkQuota", () => {
  test("無料プランは案件詳細3件まで", () => {
    const usage = { ...emptyUsage(), detailViewedCount: 3 };
    const r = checkQuota(PLANS.free, usage, "job.detail");
    expect(r.ok).toBe(false);
  });

  test("スタンダード以上は案件詳細が無制限", () => {
    const usage = { ...emptyUsage(), detailViewedCount: 999 };
    const r = checkQuota(PLANS.std, usage, "job.detail");
    expect(r.ok).toBe(true);
  });

  test("無料プランは書類発行できない", () => {
    const r = checkQuota(PLANS.free, emptyUsage(), "document.issue");
    expect(r.ok).toBe(false);
  });

  test("スタンダード以上は書類発行できる", () => {
    const r = checkQuota(PLANS.std, emptyUsage(), "document.issue");
    expect(r.ok).toBe(true);
  });

  test("空き情報は同時掲載数で判定する", () => {
    const under = checkQuota(PLANS.free, { ...emptyUsage(), openAvailabilityCount: 0 }, "availability.slot");
    const over = checkQuota(PLANS.free, { ...emptyUsage(), openAvailabilityCount: 1 }, "availability.slot");
    expect(under.ok).toBe(true);
    expect(over.ok).toBe(false);
  });
});

describe("checkScoutView", () => {
  test("無料プランはポイントがなければ開けない", () => {
    const r = checkScoutView(PLANS.free, 0, false);
    expect(r.ok).toBe(false);
  });

  test("無料プランでもポイントがあれば開ける", () => {
    const r = checkScoutView(PLANS.free, 1, false);
    expect(r.ok).toBe(true);
  });

  test("既に開いたスカウトはポイントを消費しない", () => {
    const r = checkScoutView(PLANS.free, 0, true);
    expect(r.ok).toBe(true);
  });

  test("有料プランはポイントに関係なく開ける", () => {
    const r = checkScoutView(PLANS.std, 0, false);
    expect(r.ok).toBe(true);
  });
});
