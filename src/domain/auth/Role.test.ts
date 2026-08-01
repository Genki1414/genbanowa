import { describe, expect, test } from "vitest";
import { countsTowardUserLimit, BASIC_INVITE_ROLES, ADVANCED_INVITE_ROLES } from "./Role";

describe("countsTowardUserLimit", () => {
  test("owner・admin・accounting はユーザー数上限に数える", () => {
    expect(countsTowardUserLimit("owner")).toBe(true);
    expect(countsTowardUserLimit("admin")).toBe(true);
    expect(countsTowardUserLimit("accounting")).toBe(true);
  });

  test("field・viewer は上限に数えない（無制限）", () => {
    expect(countsTowardUserLimit("field")).toBe(false);
    expect(countsTowardUserLimit("viewer")).toBe(false);
  });
});

describe("招待フォームの露出", () => {
  test("基本の招待ロールに admin・viewer を含まない", () => {
    expect(BASIC_INVITE_ROLES).not.toContain("admin");
    expect(BASIC_INVITE_ROLES).not.toContain("viewer");
    expect(BASIC_INVITE_ROLES).not.toContain("owner");
  });

  test("詳細設定に admin・viewer が入っている", () => {
    expect(ADVANCED_INVITE_ROLES).toContain("admin");
    expect(ADVANCED_INVITE_ROLES).toContain("viewer");
  });
});
