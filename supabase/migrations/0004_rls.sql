-- ゲンバノワ RLS方針
-- 出典: docs/01_実装設計書.md 2章、docs/04_権限ロール設計.md 3章
--
-- RLSは第一防壁。金額の秘匿やプラン依存の開示など「列単位」の制御はRLSではできないため、
-- Server Action 側でも必ず二重に検査する（stripAmounts() 等）。
-- companies_public / companies_stats / companies_rating / companies_payment / companies_url は
-- 意図的にRLSを経由しない公開ビュー（会社をさがす機能のため、あえて他社の情報を見せる）。

-- ============================================================
-- companies / users
-- ============================================================

alter table companies enable row level security;

create policy companies_own_select on companies for select
  using (id = my_company());

create policy companies_own_update on companies for update
  using (id = my_company())
  with check (id = my_company());

grant select on companies_public, companies_stats, companies_rating, companies_url, companies_payment
  to authenticated;

alter table users enable row level security;

create policy users_same_company_select on users for select
  using (company_id = my_company());

-- 招待・削除・ロール変更は owner のみが行う操作であり、権限判定を伴うため
-- Server Action 内で SECURITY DEFINER 関数 / service role を使って行う。RLSからの直接書き込みは許可しない。

-- ============================================================
-- 信用（書類・スコア・評価）
-- ============================================================

alter table trust_documents enable row level security;

create policy trust_documents_own_select on trust_documents for select
  using (company_id = my_company());

create policy trust_documents_own_insert on trust_documents for insert
  with check (company_id = my_company());

-- 承認・却下は運営のみ（service role 経由。ここではポリシーを設けず default deny）

alter table trust_ratings enable row level security;
-- 直接の select は許可しない。開示は companies_rating ビュー（プラン検査つき）経由のみ。

-- ============================================================
-- 案件・応募・空き情報・スカウト
-- ============================================================

alter table jobs enable row level security;

create policy jobs_public_select on jobs for select using (true);

create policy jobs_own_write on jobs for all
  using (company_id = my_company())
  with check (company_id = my_company());

alter table job_applications enable row level security;

create policy job_applications_parties_select on job_applications for select
  using (
    company_id = my_company()
    or exists (select 1 from jobs j where j.id = job_applications.job_id and j.company_id = my_company())
  );

create policy job_applications_own_insert on job_applications for insert
  with check (company_id = my_company());

alter table availabilities enable row level security;

create policy availabilities_public_select on availabilities for select using (true);

create policy availabilities_own_write on availabilities for all
  using (company_id = my_company())
  with check (company_id = my_company());

alter table scouts enable row level security;

create policy scouts_parties_select on scouts for select
  using (to_company = my_company() or from_company = my_company());

create policy scouts_own_insert on scouts for insert
  with check (from_company = my_company());

-- ============================================================
-- 会話・メッセージ
-- ============================================================

alter table conversations enable row level security;

create policy conversations_parties_select on conversations for select
  using (company_a = my_company() or company_b = my_company());

create policy conversations_parties_insert on conversations for insert
  with check (company_a = my_company() or company_b = my_company());

alter table messages enable row level security;

create policy messages_parties_select on messages for select
  using (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and (c.company_a = my_company() or c.company_b = my_company())
    )
  );

create policy messages_parties_insert on messages for insert
  with check (
    sender_company = my_company()
    and exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and (c.company_a = my_company() or c.company_b = my_company())
    )
  );

-- ============================================================
-- 取引（金額の列レベル秘匿はここでは行わない。Server Action で stripAmounts()）
-- ============================================================
--
-- orders / order_requests / daily_reports / invoices / payment_disputes / site_assignments は
-- どれも「transactions の当事者かどうか」を問い合わせて可否を決める。この相互参照を生の
-- 相関サブクエリで書くと、テーブルをまたいだRLSポリシーの展開が循環し
-- "infinite recursion detected in policy" になる。is_tx_party() / can_see_transaction() は
-- SECURITY DEFINER で transactions を RLSを経由せずに読むため、循環を断ち切れる。
--
-- SELECT は can_see_transaction()（field は担当のみ）、書き込みは is_tx_party()
-- （会社単位。field が書けるかどうかの細かい制御は can() を使う Server Action の役目）で統一する。

alter table transactions enable row level security;

create policy tx_scope_select on transactions for select
  using (can_see_transaction(id));

create policy tx_parties_write on transactions for insert with check (is_tx_party(id));
create policy tx_parties_update on transactions for update
  using (is_tx_party(id)) with check (is_tx_party(id));

alter table orders enable row level security;

create policy orders_scope_select on orders for select using (can_see_transaction(transaction_id));
create policy orders_parties_write on orders for insert with check (is_tx_party(transaction_id));
create policy orders_parties_update on orders for update
  using (is_tx_party(transaction_id)) with check (is_tx_party(transaction_id));

alter table order_requests enable row level security;

create policy order_requests_scope_select on order_requests for select using (can_see_transaction(transaction_id));
create policy order_requests_parties_write on order_requests for insert with check (is_tx_party(transaction_id));
create policy order_requests_parties_update on order_requests for update
  using (is_tx_party(transaction_id)) with check (is_tx_party(transaction_id));

alter table daily_reports enable row level security;

create policy daily_reports_scope_select on daily_reports for select using (can_see_transaction(transaction_id));
create policy daily_reports_parties_write on daily_reports for insert with check (is_tx_party(transaction_id));

alter table invoices enable row level security;

create policy invoices_scope_select on invoices for select using (can_see_transaction(transaction_id));
create policy invoices_parties_write on invoices for insert with check (is_tx_party(transaction_id));
create policy invoices_parties_update on invoices for update
  using (is_tx_party(transaction_id)) with check (is_tx_party(transaction_id));

alter table payment_disputes enable row level security;

create policy payment_disputes_scope_select on payment_disputes for select
  using (
    exists (
      select 1 from invoices i
      where i.id = payment_disputes.invoice_id and can_see_transaction(i.transaction_id)
    )
  );

alter table payment_dispute_logs enable row level security;

create policy payment_dispute_logs_scope_select on payment_dispute_logs for select
  using (
    exists (
      select 1 from payment_disputes d
      join invoices i on i.id = d.invoice_id
      where d.id = payment_dispute_logs.dispute_id and can_see_transaction(i.transaction_id)
    )
  );

-- 運営による決定（record_payment_delay など）は SECURITY DEFINER 関数のみで行う。直接の update は許可しない。

alter table site_assignments enable row level security;

create policy site_assignments_visible on site_assignments for select
  using (user_id = auth.uid() or is_tx_party(transaction_id));

create policy site_assignments_manage on site_assignments for insert
  with check (is_tx_party(transaction_id));

-- ============================================================
-- 現場・写真
-- ============================================================

alter table sites enable row level security;

create policy sites_own_company on sites for all
  using (company_id = my_company())
  with check (company_id = my_company());

alter table photos enable row level security;

create policy photos_own_site on photos for all
  using (exists (select 1 from sites s where s.id = photos.site_id and s.company_id = my_company()));

-- ============================================================
-- 取引先・アプリ外書類
-- ============================================================

alter table partners enable row level security;

create policy partners_own_company on partners for all
  using (company_id = my_company())
  with check (company_id = my_company());

alter table invitations enable row level security;

create policy invitations_own_company on invitations for all
  using (from_company = my_company())
  with check (from_company = my_company());

alter table standalone_documents enable row level security;

create policy standalone_documents_own_company on standalone_documents for all
  using (company_id = my_company())
  with check (company_id = my_company());

-- ============================================================
-- 使用量・通知・監査ログ
-- ============================================================

alter table usage_counters enable row level security;

create policy usage_counters_own_company on usage_counters for select
  using (company_id = my_company());

alter table notifications enable row level security;

create policy notifications_own_company on notifications for select
  using (company_id = my_company() and (user_id is null or user_id = auth.uid()));

create policy notifications_mark_read on notifications for update
  using (company_id = my_company() and (user_id is null or user_id = auth.uid()))
  with check (company_id = my_company() and (user_id is null or user_id = auth.uid()));

alter table audit_logs enable row level security;

create policy audit_logs_own_company on audit_logs for select
  using (company_id = my_company());
