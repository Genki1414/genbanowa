import { describe, expect, test } from "vitest";
import { unreadCount, Message } from "./Conversation";

const base: Message = {
  id: "m1",
  conversationId: "c1",
  senderCompanyId: "companyA",
  readAt: null,
  createdAt: "2026-08-01T00:00:00Z",
};

describe("unreadCount", () => {
  test("相手からの未読メッセージだけを数える", () => {
    const messages: Message[] = [
      { ...base, id: "m1", senderCompanyId: "companyA", readAt: null },
      { ...base, id: "m2", senderCompanyId: "companyA", readAt: "2026-08-02T00:00:00Z" },
      { ...base, id: "m3", senderCompanyId: "companyB", readAt: null },
    ];
    expect(unreadCount(messages, "companyB")).toBe(1);
  });

  test("自分が送ったメッセージは未読として数えない", () => {
    const messages: Message[] = [{ ...base, senderCompanyId: "companyB", readAt: null }];
    expect(unreadCount(messages, "companyB")).toBe(0);
  });
});
