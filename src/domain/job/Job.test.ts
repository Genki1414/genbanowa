import { describe, expect, test } from "vitest";
import { canApply, Job } from "./Job";

const baseJob: Job = {
  id: "j1",
  companyId: "companyA",
  name: "五井中央 共同住宅 外部足場",
  keishiki: "ukeoi",
  industry: "足場",
  area: "千葉県",
  price: 2000000,
  tanka: 0,
  headcount: 0,
  isPublicWork: false,
  status: "open",
  postedAt: "2026-08-01T00:00:00Z",
};

describe("canApply", () => {
  test("募集中で自社の案件でなければ応募できる", () => {
    expect(canApply(baseJob, "companyB")).toBe(true);
  });

  test("自社の案件には応募できない", () => {
    expect(canApply(baseJob, "companyA")).toBe(false);
  });

  test("募集中でない案件には応募できない", () => {
    expect(canApply({ ...baseJob, status: "closed" }, "companyB")).toBe(false);
    expect(canApply({ ...baseJob, status: "paused" }, "companyB")).toBe(false);
  });
});
