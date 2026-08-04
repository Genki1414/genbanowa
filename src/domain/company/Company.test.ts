import { describe, expect, test } from "vitest";
import { canSeeStats, canSeeRating, canSeePayment } from "./Company";

describe("会社ページの開示レベル", () => {
  test("free（0）は取引実績も見えない", () => {
    expect(canSeeStats(0)).toBe(false);
    expect(canSeeRating(0)).toBe(false);
    expect(canSeePayment(0)).toBe(false);
  });

  test("std（1）は取引実績のみ見える", () => {
    expect(canSeeStats(1)).toBe(true);
    expect(canSeeRating(1)).toBe(false);
    expect(canSeePayment(1)).toBe(false);
  });

  test("pro（2）は運営評価まで見える", () => {
    expect(canSeeStats(2)).toBe(true);
    expect(canSeeRating(2)).toBe(true);
    expect(canSeePayment(2)).toBe(false);
  });

  test("prem（3）は支払実績まで全部見える", () => {
    expect(canSeeStats(3)).toBe(true);
    expect(canSeeRating(3)).toBe(true);
    expect(canSeePayment(3)).toBe(true);
  });
});
