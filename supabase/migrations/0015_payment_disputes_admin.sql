-- P6: 入金確認・異議申立・運営画面
-- 出典: docs/01_実装設計書.md 1-6章、docs/03_規約・信用情報方針ドラフト.md 4-4章

-- 運営（プラットフォーム運営側）のフラグ。会社ロール（owner/admin等）とは別軸で、
-- 特定のusers行にだけ立てる。付与・剥奪はSQLで直接行い、アプリからは変更できない。
alter table users add column is_staff boolean not null default false;

create or replace function my_is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_staff from users where id = auth.uid()), false);
$$;

revoke execute on function my_is_staff() from public;
grant execute on function my_is_staff() to authenticated;

-- record_payment_delay に判断者（運営ユーザー）を記録できるよう引数を追加し、
-- 「運営が事実確認中(under_review)」からしか確定できないよう遷移元を絞る。
drop function if exists record_payment_delay(uuid, text, text);

create or replace function record_payment_delay(
  p_dispute_id uuid,
  p_decision text,
  p_note text default null,
  p_decided_by uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_decision not in ('recorded', 'resolved') then
    raise exception 'invalid decision: %', p_decision;
  end if;

  update payment_disputes
     set status = p_decision,
         decided_at = now(),
         decided_by = p_decided_by,
         decision_note = p_note
   where id = p_dispute_id
     and status = 'under_review'; -- 運営の事実確認を経ていないものは確定させない
end;
$$;

-- authenticatedには渡さない（運営専用。Server Action からservice roleで呼ぶ）。既存のコメントのとおり。

-- ============================================================
-- payment_disputes / payment_dispute_logs のRLS強化
-- ============================================================
-- 0004_rls.sql の時点ではSELECTポリシーのみで、INSERT/UPDATEポリシーが無かった
-- （P6未実装だったため）。ここで追加する。

-- 確認依頼を作れるのは受注者のみ（04_権限ロール設計.md「異議申立」は当事者間の手続き）。
create policy payment_disputes_uke_insert on payment_disputes for insert
  with check (
    exists (
      select 1 from invoices i
      join transactions t on t.id = i.transaction_id
      where i.id = payment_disputes.invoice_id and t.uke_company = my_company()
    )
  );

-- 当事者（発注・受注どちらでも）は、運営が事実確認に入る(under_review)前までは更新できる。
-- 'recorded' には当事者からは絶対に遷移できないようwith checkで塞ぐ（信用情報の記録は運営のみ）。
-- decided_by/decided_at は当事者からは触らせない（record_payment_delay経由のみで埋まる）。
create policy payment_disputes_party_update on payment_disputes for update
  using (
    exists (
      select 1 from invoices i where i.id = payment_disputes.invoice_id and is_tx_party(i.transaction_id)
    )
    and status <> 'under_review'
  )
  with check (
    exists (
      select 1 from invoices i where i.id = payment_disputes.invoice_id and is_tx_party(i.transaction_id)
    )
    and status in ('confirming', 'date_proposed', 'objected', 'under_review', 'resolved')
    and decided_by is null
  );

-- 運営はすべてのdisputeを閲覧できる（会社をまたいだ一覧画面のため）。
-- 実際の確定（decideDispute）はrecord_payment_delay経由（service role）で行うため、
-- staff向けのupdateポリシーは設けない＝直接のUPDATEは常にdefault deny。
create policy payment_disputes_staff_select on payment_disputes for select
  using (my_is_staff());

create policy payment_dispute_logs_party_insert on payment_dispute_logs for insert
  with check (
    exists (
      select 1 from payment_disputes d
      join invoices i on i.id = d.invoice_id
      where d.id = payment_dispute_logs.dispute_id and is_tx_party(i.transaction_id)
    )
  );

create policy payment_dispute_logs_staff_select on payment_dispute_logs for select
  using (my_is_staff());
