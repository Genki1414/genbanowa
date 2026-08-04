-- P3: 案件詳細の閲覧記録
-- docs/01_実装設計書.md 3章「viewJobDetail | jobId | detail_views < detail_per_month
-- （重複閲覧は消費しない）」を実現するには、どの会社がどの案件をもう見たかを
-- 覚えておく場所が要る。usage_counters.detail_views は月次カウンタの型だけ用意されていて
-- 実際には使われていなかったので、代わりにこのテーブルの行数を直接数える
-- （conversationsStartedThisMonth と同じ考え方）。

create table job_detail_views (
  company_id uuid not null references companies(id) on delete cascade,
  job_id     uuid not null references jobs(id) on delete cascade,
  viewed_at  timestamptz not null default now(),
  primary key (company_id, job_id)
);
create index on job_detail_views (company_id, viewed_at);

alter table job_detail_views enable row level security;

create policy job_detail_views_own_select on job_detail_views for select
  using (company_id = my_company());

create policy job_detail_views_own_insert on job_detail_views for insert
  with check (company_id = my_company());
