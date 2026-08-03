import { describe, expect, test } from "vitest";
import { Transaction, Actor, TransactionProps } from "./Transaction";
import { overAmount as computeOverAmount } from "./Invoice";

const MOTO = "company_moto";
const UKE = "company_uke";

const moto: Actor = { companyId: MOTO, role: "owner" };
const uke: Actor = { companyId: UKE, role: "owner" };

function baseProps(overrides: Partial<TransactionProps> = {}): TransactionProps {
  return {
    id: "tx1",
    title: "テスト工事",
    motoCompanyId: MOTO,
    ukeCompanyId: UKE,
    status: "active",
    orders: [],
    orderRequests: [],
    dailyReports: [],
    invoices: [],
    createdAt: "2026-08-01T00:00:00Z",
    completedAt: null,
    ...overrides,
  };
}

describe("注文書 → 請書", () => {
  test("発注側だけが注文書を発行できる", () => {
    const tx = Transaction.create(baseProps());
    const r = tx.addOrder(
      { keishiki: "ukeoi", amount: 1_000_000, kokiFrom: "2026-09-01", kokiTo: "2026-09-10", paymentTerms: "翌月末" },
      uke,
      "2026-08-01",
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("NOT_MOTO");
  });

  test("請書が返っていない注文書には請求できない", () => {
    const tx = Transaction.create(baseProps());
    const issued = tx.addOrder(
      { keishiki: "ukeoi", amount: 1_000_000, kokiFrom: "2026-09-01", kokiTo: "2026-09-10", paymentTerms: "翌月末" },
      moto,
      "2026-08-01",
    );
    expect(issued.ok).toBe(true);
    if (!issued.ok) return;

    const orderId = issued.value.orders[0].id;
    const r = issued.value.submitInvoice(
      { orderId, amount: 500_000, tax: 50_000, basis: "manual", dueDate: "2026-09-30" },
      uke,
      "2026-09-01",
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("ORDER_NOT_ACCEPTED");
  });

  test("受注側が請書を返すと請求できるようになる", () => {
    const tx = Transaction.create(baseProps());
    const issued = tx.addOrder(
      { keishiki: "ukeoi", amount: 1_000_000, kokiFrom: "2026-09-01", kokiTo: "2026-09-10", paymentTerms: "翌月末" },
      moto,
      "2026-08-01",
    );
    if (!issued.ok) throw new Error("unreachable");
    const orderId = issued.value.orders[0].id;

    const accepted = issued.value.acceptOrder(orderId, uke, "2026-08-02");
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) return;

    const invoiced = accepted.value.submitInvoice(
      { orderId, amount: 500_000, tax: 50_000, basis: "manual", dueDate: "2026-09-30" },
      uke,
      "2026-09-01",
    );
    expect(invoiced.ok).toBe(true);
  });
});

describe("請求の超過は警告のみで拒否しない", () => {
  test("注文書の金額を超える請求は overAmount が正になるが submitInvoice は成功する", () => {
    const tx = Transaction.create(baseProps());
    const issued = tx.addOrder(
      { keishiki: "ukeoi", amount: 1_000_000, kokiFrom: "2026-09-01", kokiTo: "2026-09-10", paymentTerms: "翌月末" },
      moto,
      "2026-08-01",
    );
    if (!issued.ok) throw new Error("unreachable");
    const orderId = issued.value.orders[0].id;
    const accepted = issued.value.acceptOrder(orderId, uke, "2026-08-02");
    if (!accepted.ok) throw new Error("unreachable");

    const invoiced = accepted.value.submitInvoice(
      { orderId, amount: 1_200_000, tax: 120_000, basis: "manual", dueDate: "2026-09-30" },
      uke,
      "2026-09-01",
    );
    expect(invoiced.ok).toBe(true);
    if (!invoiced.ok) return;
    expect(invoiced.value.overAmount(orderId)).toBe(200_000);
  });

  test("computeOverAmount は却下された請求を除外する", () => {
    const over = computeOverAmount(
      1_000_000,
      [
        { id: "v1", orderId: "o1", amount: 900_000, tax: 90_000, basis: "manual", dueDate: "2026-09-30", status: "rejected", approvedAt: null, paidAt: null, receivedAt: null, receivedOn: null, rejectedAt: "2026-08-01" },
        { id: "v2", orderId: "o1", amount: 300_000, tax: 30_000, basis: "manual", dueDate: "2026-09-30", status: "submitted", approvedAt: null, paidAt: null, receivedAt: null, receivedOn: null, rejectedAt: null },
      ],
      "o1",
    );
    expect(over).toBe(-700_000);
  });
});

describe("期日内入金は取引ごとに何度でもカウントされる", () => {
  test("複数の請求がそれぞれ期日内に入金確認されると、両方カウントの対象になる", () => {
    let tx = Transaction.create(baseProps());
    const issued = tx.addOrder(
      { keishiki: "ukeoi", amount: 2_000_000, kokiFrom: "2026-09-01", kokiTo: "2026-09-10", paymentTerms: "翌月末" },
      moto,
      "2026-08-01",
    );
    if (!issued.ok) throw new Error("unreachable");
    const orderId = issued.value.orders[0].id;
    const accepted = issued.value.acceptOrder(orderId, uke, "2026-08-02");
    if (!accepted.ok) throw new Error("unreachable");
    tx = accepted.value;

    for (const amount of [1_000_000, 1_000_000]) {
      const invoiced = tx.submitInvoice(
        { orderId, amount, tax: amount / 10, basis: "manual", dueDate: "2026-09-30" },
        uke,
        "2026-09-01",
      );
      if (!invoiced.ok) throw new Error("unreachable");
      tx = invoiced.value;
    }

    for (const invoice of tx.invoices) {
      const approved = tx.approveInvoice(invoice.id, moto, "2026-09-05");
      if (!approved.ok) throw new Error("unreachable");
      tx = approved.value;
    }
    for (const invoice of tx.invoices) {
      const paid = tx.registerPayment(invoice.id, moto, "2026-09-20");
      if (!paid.ok) throw new Error("unreachable");
      tx = paid.value;
    }
    for (const invoice of tx.invoices) {
      const received = tx.confirmReceipt(invoice.id, "2026-09-25", uke, "2026-09-25");
      if (!received.ok) throw new Error("unreachable");
      tx = received.value;
    }

    expect(tx.invoices.every((v) => v.status === "received" && v.receivedOn! <= v.dueDate)).toBe(true);
    expect(tx.invoices).toHaveLength(2);
  });
});

describe("請求承認の金額上限", () => {
  test("accounting は50万円を超える請求を単独承認できない", () => {
    const tx = Transaction.create(baseProps());
    const issued = tx.addOrder(
      { keishiki: "ukeoi", amount: 2_000_000, kokiFrom: "2026-09-01", kokiTo: "2026-09-10", paymentTerms: "翌月末" },
      moto,
      "2026-08-01",
    );
    if (!issued.ok) throw new Error("unreachable");
    const orderId = issued.value.orders[0].id;
    const accepted = issued.value.acceptOrder(orderId, uke, "2026-08-02");
    if (!accepted.ok) throw new Error("unreachable");
    const invoiced = accepted.value.submitInvoice(
      { orderId, amount: 900_000, tax: 90_000, basis: "manual", dueDate: "2026-09-30" },
      uke,
      "2026-09-01",
    );
    if (!invoiced.ok) throw new Error("unreachable");

    const accountingActor: Actor = { companyId: MOTO, role: "accounting" };
    const r = invoiced.value.approveInvoice(invoiced.value.invoices[0].id, accountingActor, "2026-09-05");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("EXCEEDS_APPROVAL_LIMIT");
  });
});

describe("金額の秘匿", () => {
  test("field ロールに渡す前に stripAmounts すると金額が0になる", () => {
    const tx = Transaction.create(baseProps());
    const issued = tx.addOrder(
      { keishiki: "ukeoi", amount: 1_000_000, kokiFrom: "2026-09-01", kokiTo: "2026-09-10", paymentTerms: "翌月末" },
      moto,
      "2026-08-01",
    );
    if (!issued.ok) throw new Error("unreachable");

    const stripped = issued.value.stripAmounts("field");
    expect(stripped.orders[0].amount).toBe(0);

    const kept = issued.value.stripAmounts("owner");
    expect(kept.orders[0].amount).toBe(1_000_000);
  });
});

describe("availableActions が唯一の真実", () => {
  test("請書待ちの取引では uke に order.accept が見える", () => {
    const tx = Transaction.create(baseProps());
    const issued = tx.addOrder(
      { keishiki: "ukeoi", amount: 1_000_000, kokiFrom: "2026-09-01", kokiTo: "2026-09-10", paymentTerms: "翌月末" },
      moto,
      "2026-08-01",
    );
    if (!issued.ok) throw new Error("unreachable");

    expect(issued.value.availableActions(uke)).toContain("order.accept");
    expect(issued.value.availableActions(moto)).not.toContain("order.accept");
  });

  test("field は追加工事の依頼だけできる", () => {
    const tx = Transaction.create(baseProps());
    const fieldActor: Actor = { companyId: UKE, role: "field" };
    const actions = tx.availableActions(fieldActor);
    expect(actions).toContain("order.requestAdditional");
    expect(actions).not.toContain("invoice.create");
    expect(actions).not.toContain("order.issue");
  });
});
