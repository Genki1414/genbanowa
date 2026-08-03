-- P2: 会話・メッセージ
-- 0004時点ではconversations/messagesはSELECT/INSERTのみで、
-- 「最終メッセージ日時の更新」「既読化」に必要なUPDATEポリシーが無かった。

create policy conversations_parties_update on conversations for update
  using (company_a = my_company() or company_b = my_company())
  with check (company_a = my_company() or company_b = my_company());

-- 既読化は「相手が送ったメッセージ」にのみ許可する（自分の送信メッセージを書き換えさせない）。
create policy messages_mark_read on messages for update
  using (
    sender_company <> my_company()
    and exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and (c.company_a = my_company() or c.company_b = my_company())
    )
  )
  with check (
    sender_company <> my_company()
    and exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and (c.company_a = my_company() or c.company_b = my_company())
    )
  );
