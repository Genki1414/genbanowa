import { describe, it, expect } from "vitest";
import { canRequestConfirmation, canRespond, canAcceptProposedDate, canEscalate, canDecide, isOverdue, PaymentDispute } from "./Dispute";

const dispute = (status: PaymentDispute["status"]): PaymentDispute => ({
  id: "d1",
  invoiceId: "i1",
  status,
  createdAt: "2026-01-01T00:00:00Z",
});

describe("isOverdue", () => {
  it("当日は超過に含めない", () => {
    expect(isOverdue("2026-09-30", "2026-09-30")).toBe(false);
  });
  it("翌日以降は超過", () => {
    expect(isOverdue("2026-09-30", "2026-10-01")).toBe(true);
  });
});

describe("canRequestConfirmation", () => {
  it("承認済みで期日超過、dispute無しなら依頼できる", () => {
    expect(canRequestConfirmation("approved", "2026-09-30", "2026-10-01", null)).toBe(true);
  });
  it("期日内なら依頼できない", () => {
    expect(canRequestConfirmation("approved", "2026-09-30", "2026-09-30", null)).toBe(false);
  });
  it("submittedやreceivedでは依頼できない", () => {
    expect(canRequestConfirmation("submitted", "2026-09-30", "2026-10-01", null)).toBe(false);
    expect(canRequestConfirmation("received", "2026-09-30", "2026-10-01", null)).toBe(false);
  });
  it("進行中のdisputeが既にあれば依頼できない", () => {
    expect(canRequestConfirmation("approved", "2026-09-30", "2026-10-01", dispute("confirming"))).toBe(false);
  });
  it("既存disputeがresolved/recordedなら再度依頼できる", () => {
    expect(canRequestConfirmation("approved", "2026-09-30", "2026-10-01", dispute("resolved"))).toBe(true);
    expect(canRequestConfirmation("approved", "2026-09-30", "2026-10-01", dispute("recorded"))).toBe(true);
  });
});

describe("状態ごとの遷移可否", () => {
  it("canRespondはconfirmingのときだけtrue", () => {
    expect(canRespond(dispute("confirming"))).toBe(true);
    expect(canRespond(dispute("date_proposed"))).toBe(false);
  });
  it("canAcceptProposedDateはdate_proposedのときだけtrue", () => {
    expect(canAcceptProposedDate(dispute("date_proposed"))).toBe(true);
    expect(canAcceptProposedDate(dispute("confirming"))).toBe(false);
  });
  it("canEscalateはconfirming/date_proposed/objectedでtrue", () => {
    expect(canEscalate(dispute("confirming"))).toBe(true);
    expect(canEscalate(dispute("date_proposed"))).toBe(true);
    expect(canEscalate(dispute("objected"))).toBe(true);
    expect(canEscalate(dispute("under_review"))).toBe(false);
  });
  it("canDecideはunder_reviewのときだけtrue", () => {
    expect(canDecide(dispute("under_review"))).toBe(true);
    expect(canDecide(dispute("confirming"))).toBe(false);
  });
});
