import { describe, it, expect } from "vitest";
import { renderNotification } from "./Notification";

describe("renderNotification", () => {
  it("ORD_ISSUEDは重要度Aで、相手企業名と金額を文面に埋め込む", () => {
    const r = renderNotification("ORD_ISSUED", { partner: "京葉建設工業", amount: "¥1,860,000" });
    expect(r.severity).toBe("A");
    expect(r.body).toContain("京葉建設工業");
    expect(r.body).toContain("¥1,860,000");
  });

  it("CMP_APPROVEDは変数を使わない固定文面", () => {
    const r = renderNotification("CMP_APPROVED", {});
    expect(r.title).toBe("取引が完了しました");
  });

  it("PAY_CONFIRMEDは重要度Bになる（docs/02_通知設計書.md 2-2章のとおり）", () => {
    const r = renderNotification("PAY_CONFIRMED", { partner: "高橋工業" });
    expect(r.severity).toBe("B");
  });
});
