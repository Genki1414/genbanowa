-- 取引完了時に信用スコアを再計算する。
-- 01_実装設計書.md 第4章「TransactionCompleted イベント | 完了承認時に発火 → 信用スコア再計算」の実装。
-- Server Action 側に「呼び忘れ」の余地を残さないため、承認自体はどの経路（アプリ／将来の運営画面）で
-- 行われても確実に発火するトリガーとして持つ。

create or replace function trg_transaction_completed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    perform recalc_trust_score(new.moto_company);
    perform recalc_trust_score(new.uke_company);
  end if;
  return new;
end;
$$;

drop trigger if exists transactions_completed_recalc on transactions;
create trigger transactions_completed_recalc
  after update on transactions
  for each row
  execute function trg_transaction_completed();
