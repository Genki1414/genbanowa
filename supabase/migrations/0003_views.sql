-- ゲンバノワ 会社の開示範囲ビュー
-- 出典: docs/01_実装設計書.md 2章
-- プラン依存の開示はビューを分ける（RLSでは列制御ができないため）。
-- 各ビューは Server Action 側でもプランを検査してから読む。RLSだけに頼らない。

-- 基本情報・信用スコア・提出書類の有無。全員に開示
create view companies_public as
select
  id, name, type, rep_name, established, area_pref(address) as area,
  industries, service_areas, license_no, trust_score, trust_level,
  (select array_agg(kind) from trust_documents where company_id = companies.id and status = 'approved')
    as approved_doc_kinds
from companies;

-- 発注数・受注数・取引社数。std 以上
create view companies_stats as
select
  c.id as company_id,
  (select count(*) from transactions t where t.moto_company = c.id) as hacchu_count,
  (select count(*) from transactions t where t.uke_company = c.id) as jucchu_count,
  (select count(distinct partner) from (
     select uke_company as partner from transactions where moto_company = c.id
     union
     select moto_company as partner from transactions where uke_company = c.id
   ) p) as partner_count
from companies c;

-- 運営の星評価。pro 以上
create view companies_rating as
select company_id, stars, note
from trust_ratings;

-- HP・SNSのURL。pro 以上
create view companies_url as
select id as company_id, url
from companies
where url is not null;

-- 期日内支払数・遅延数（発注側としての実績）。prem 以上
-- 遅延は payment_disputes が 'recorded' になったものだけをカウントする（確定するまで記録しない）。
-- 期日内入金は取引ごとに何度でもカウントする。
create view company_payment_stats as
select
  t.moto_company as company_id,
  count(*) filter (where i.received_on is not null and i.received_on <= i.due_date) as ontime_count,
  count(*) filter (where d.status = 'recorded') as delay_count
from invoices i
join transactions t on t.id = i.transaction_id
left join payment_disputes d on d.invoice_id = i.id
where i.status = 'received' or d.status = 'recorded'
group by t.moto_company;

create view companies_payment as
select company_id, ontime_count, delay_count
from company_payment_stats;
