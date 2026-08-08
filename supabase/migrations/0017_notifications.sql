-- P8: 通知（アプリ内バッジのみ。プッシュ／LINE／メールは別途連携が必要なため対象外）
-- 出典: docs/02_通知設計書.md
--
-- notifications テーブル・RLS（company_id=my_company()、user_id null=会社全員向け）は
-- 0001_init_schema.sql / 0004_rls.sql の時点で既に用意されていた（P0が先取りしていた）。
-- ここでは、当時は無かった severity / entity_type / entity_id 列の追加と、
-- 書き込み経路を service role（notify()ヘルパー）に限定する列権限だけを行う。

alter table notifications add column severity text not null default 'C' check (severity in ('A', 'B', 'C'));
alter table notifications alter column severity drop default;
alter table notifications add column entity_type text not null default '';
alter table notifications alter column entity_type drop default;
alter table notifications add column entity_id uuid;

-- 挿入は通知の送り主（自社ではなく相手企業宛てになることが大半）が行うため、
-- 行単位のRLS（company_id=my_company()）では表現できない。record_payment_delay等と同じく
-- service role（Server Actionのnotify()ヘルパー）からのみ書き込む。authenticatedには渡さない。
revoke insert on notifications from authenticated;

-- 既読化（read_at）以外は通常ユーザーから変更できないようにする。
revoke update on notifications from authenticated;
grant update (read_at) on notifications to authenticated;
