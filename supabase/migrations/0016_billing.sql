-- P7: 課金（Stripe）
-- 出典: docs/00_CLAUDE_CODE_キックオフ.md 5章（プラン）、docs/03_規約・信用情報方針ドラフト.md 3章（プラン変更）

alter table companies add column stripe_customer_id text unique;
alter table companies add column stripe_subscription_id text;

-- companies.plan は今後お金に直結する列になる。0004_rls.sql の companies_own_update は
-- 行単位（id = my_company()）のチェックしかしておらず、列単位の制御がなかったため、
-- 認証済みユーザーが直接 update({plan:'prem'}) を叩けば無償でアップグレードできてしまっていた
-- （P7以前は plan の書き込み経路がアプリに無かったため実害はなかったが、ここで塞いでおく）。
-- plan / stripe_* / unlocked_features / trust_score / trust_level / invite_points は
-- SECURITY DEFINER関数かservice roleからしか書けないよう、列権限そのものを絞る。
revoke update on companies from authenticated;
grant update (
  name, kana, rep_name, established, postal, address, tel, url,
  industries, service_areas, license_no, license_types, license_expiry,
  insurance, invoice_no, ccus_id, stance, invoice_approval_limit
) on companies to authenticated;
