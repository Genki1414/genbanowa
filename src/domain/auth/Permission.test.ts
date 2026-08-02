import { describe, expect, test } from "vitest";
import { can, requiresOwnerApproval } from "./Permission";
import { canSeeAmount } from "./Role";

describe("金額の秘匿", () => {
  test("field ロールは金額を見られない", () => {
    expect(canSeeAmount("field")).toBe(false);
    expect(can("field", "amount.view")).toBe(false);
  });

  test("owner・admin・accounting・viewer は金額を見られる", () => {
    expect(can("owner", "amount.view")).toBe(true);
    expect(can("admin", "amount.view")).toBe(true);
    expect(can("accounting", "amount.view")).toBe(true);
    expect(can("viewer", "amount.view")).toBe(true);
  });
});

describe("契約行為は決裁権のある人に限る", () => {
  test("注文書の発行は field にはできない", () => {
    expect(can("field", "order.issue")).toBe(false);
    expect(can("accounting", "order.issue")).toBe(true);
  });

  test("取引の依頼は owner・admin のみ", () => {
    expect(can("owner", "transaction.request")).toBe(true);
    expect(can("admin", "transaction.request")).toBe(true);
    expect(can("accounting", "transaction.request")).toBe(false);
    expect(can("field", "transaction.request")).toBe(false);
  });

  test("追加工事の依頼は field でもできる", () => {
    expect(can("field", "order.requestAdditional")).toBe(true);
  });
});

describe("現場担当の割り当ては owner/admin/accounting が行う", () => {
  test("field 自身は割り当てを操作できない", () => {
    expect(can("field", "assignment.manage")).toBe(false);
  });

  test("owner・admin・accounting はできる", () => {
    expect(can("owner", "assignment.manage")).toBe(true);
    expect(can("admin", "assignment.manage")).toBe(true);
    expect(can("accounting", "assignment.manage")).toBe(true);
  });
});

describe("ユーザー管理は owner のみ", () => {
  test("admin はユーザー招待・削除・ロール変更・プラン変更ができない", () => {
    expect(can("admin", "user.invite")).toBe(false);
    expect(can("admin", "user.remove")).toBe(false);
    expect(can("admin", "role.change")).toBe(false);
    expect(can("admin", "plan.change")).toBe(false);
  });
});

describe("請求承認の金額上限", () => {
  test("accounting は50万円を超える請求を単独承認できない", () => {
    expect(requiresOwnerApproval("accounting", 500_001)).toBe(true);
    expect(requiresOwnerApproval("accounting", 500_000)).toBe(false);
  });

  test("owner・admin は上限に関係なく承認できる", () => {
    expect(requiresOwnerApproval("owner", 10_000_000)).toBe(false);
    expect(requiresOwnerApproval("admin", 10_000_000)).toBe(false);
  });
});
