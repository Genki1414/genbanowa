/**
 * 通知。docs/02_通知設計書.md 2章の全イベントのうち、
 * アクション起点で判定できる重要度Aのものだけを対象にする
 * （支払期日3日前などの日付起点リマインドはスケジューラが必要なため対象外）。
 */
export type Severity = "A" | "B" | "C";

export type NotificationEvent =
  | "ORD_ISSUED"
  | "ORD_ACCEPTED"
  | "ORD_REJECTED"
  | "ORD_ADD_ISSUED"
  | "ORD_REQ"
  | "ORD_REQ_ISSUED"
  | "INV_SUBMITTED"
  | "INV_APPROVED"
  | "INV_REJECTED"
  | "PAY_REGISTERED"
  | "PAY_CONFIRMED"
  | "DSP_OPENED"
  | "DSP_PAID"
  | "DSP_DATE"
  | "DSP_OBJECTED"
  | "DSP_ESCALATED"
  | "DSP_RESOLVED"
  | "DSP_RECORDED"
  | "CMP_REQUESTED"
  | "CMP_APPROVED";

export interface Notification {
  id: string;
  companyId: string;
  userId?: string;
  event: NotificationEvent;
  severity: Severity;
  entityType: string;
  entityId: string;
  title: string;
  body: string;
  linkPath?: string;
  readAt?: string;
  createdAt: string;
}

type Vars = Record<string, string>;

interface NotificationMeta {
  severity: Severity;
  title: (v: Vars) => string;
  body: (v: Vars) => string;
}

export const NOTIFICATION_META: Record<NotificationEvent, NotificationMeta> = {
  ORD_ISSUED: {
    severity: "A",
    title: () => "注文書が届きました",
    body: (v) => `${v.partner}から注文書が届きました（${v.amount}）。内容を確認して請書を返してください`,
  },
  ORD_ACCEPTED: {
    severity: "A",
    title: () => "注文請書が返送されました",
    body: (v) => `${v.partner}が注文書No.${v.n}の請書を返しました。工事を進められます`,
  },
  ORD_REJECTED: {
    severity: "A",
    title: () => "注文書が差し戻されました",
    body: (v) => `${v.partner}が注文書No.${v.n}を差し戻しました。内容をご確認ください`,
  },
  ORD_ADD_ISSUED: {
    severity: "A",
    title: () => "追加工事の注文書が届きました",
    body: (v) => `追加工事の注文書No.${v.n}が届きました（${v.amount}）`,
  },
  ORD_REQ: {
    severity: "A",
    title: () => "追加工事の注文書を依頼されました",
    body: (v) => `${v.partner}から追加工事「${v.content}」の注文書を依頼されました`,
  },
  ORD_REQ_ISSUED: {
    severity: "A",
    title: () => "依頼した追加工事の注文書が届きました",
    body: () => "依頼した追加工事の注文書が届きました。請書を返してください",
  },
  INV_SUBMITTED: {
    severity: "A",
    title: () => "請求書が届きました",
    body: (v) => `${v.partner}から請求書が届きました（${v.amount}／期日${v.date}）`,
  },
  INV_APPROVED: {
    severity: "A",
    title: () => "請求が承認されました",
    body: (v) => `請求が承認されました。支払期日は${v.date}です`,
  },
  INV_REJECTED: {
    severity: "A",
    title: () => "請求が差し戻されました",
    body: (v) => `請求が差し戻されました。理由：${v.reason}`,
  },
  PAY_REGISTERED: {
    severity: "A",
    title: () => "支払が登録されました",
    body: (v) => `${v.partner}が支払を登録しました。入金を確認したら記録してください`,
  },
  PAY_CONFIRMED: {
    severity: "B",
    title: () => "入金が確認されました",
    body: (v) => `${v.partner}が入金を確認しました。期日内でした`,
  },
  DSP_OPENED: {
    severity: "A",
    title: () => "入金の確認依頼が届いています",
    body: (v) => `${v.partner}から入金の確認依頼が届いています。ご回答ください`,
  },
  DSP_PAID: {
    severity: "A",
    title: () => "「支払済み」と回答がありました",
    body: (v) => `${v.partner}が支払済みと回答しました。入金をご確認ください`,
  },
  DSP_DATE: {
    severity: "A",
    title: () => "支払予定日の申告がありました",
    body: (v) => `${v.partner}が支払予定日（${v.date}）を回答しました。承諾するか選べます`,
  },
  DSP_OBJECTED: {
    severity: "A",
    title: () => "異議が出されました",
    body: (v) => `${v.partner}から異議が出ました。運営が事実確認に入ります`,
  },
  DSP_ESCALATED: {
    severity: "A",
    title: () => "運営の事実確認が始まりました",
    body: () => "運営が事実確認を開始しました。結論まで信用情報には反映されません",
  },
  DSP_RESOLVED: {
    severity: "A",
    title: () => "確認が取れました",
    body: () => "確認が取れました。信用情報には記録されません",
  },
  DSP_RECORDED: {
    severity: "A",
    title: () => "遅延として記録されました",
    body: () => "遅延として記録されました。異議がある場合は運営にお問い合わせください",
  },
  CMP_REQUESTED: {
    severity: "A",
    title: () => "取引完了が申請されました",
    body: (v) => `${v.partner}が取引完了を申請しました。内容をご確認ください`,
  },
  CMP_APPROVED: {
    severity: "A",
    title: () => "取引が完了しました",
    body: () => "取引が完了しました。お疲れさまでした",
  },
};

export function renderNotification(event: NotificationEvent, vars: Vars): { severity: Severity; title: string; body: string } {
  const meta = NOTIFICATION_META[event];
  return { severity: meta.severity, title: meta.title(vars), body: meta.body(vars) };
}
