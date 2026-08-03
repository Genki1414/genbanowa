/**
 * 会話とメッセージ。取引と違って状態遷移を持たない単純な集約なので、
 * Transaction のようなクラスは作らず、型と純粋関数だけを置く。
 */
export type ConversationKind = "job" | "direct";

export interface Message {
  id: string;
  conversationId: string;
  senderCompanyId: string;
  senderUserId?: string;
  body?: string;
  readAt: string | null;
  createdAt: string;
}

/** 相手（自社以外）が送った、まだ既読になっていないメッセージの件数。 */
export function unreadCount(messages: Message[], myCompanyId: string): number {
  return messages.filter((m) => m.senderCompanyId !== myCompanyId && m.readAt === null).length;
}
