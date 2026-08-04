-- P5: 現場フォルダ・工事写真
-- 出典: docs/01_実装設計書.md 1-7章・5章、docs/04_権限ロール設計.md 2-3章
--
-- sites_own_company / photos_own_site（0004_rls.sql）は company_id = my_company() のみで
-- 「取引の当事者のみ」（01_実装設計書.md 5章のストレージ表、06_元請視点の通し検証.md
-- 「工事写真・日報｜発注側は見るだけ」）を満たしていなかったので、ここで正しいポリシーに置き換える。
-- field ロールは site_assignments に基づく「担当のみ」（取引に紐づく現場の場合）。
-- 取引に紐づかない現場（受注していない現場を直接作った場合）は担当の概念がないので、
-- 自社の owner/admin/accounting/field/viewer 全員に見せる（写真を撮る権限自体は can() 側で絞る）。

create or replace function can_see_site(p_site_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from sites s
    where s.id = p_site_id
      and (
        (s.transaction_id is not null and can_see_transaction(s.transaction_id))
        or (s.transaction_id is null and s.company_id = my_company())
      )
  );
$$;

revoke execute on function can_see_site(uuid) from public;
grant execute on function can_see_site(uuid) to authenticated;

drop policy if exists sites_own_company on sites;

create policy sites_select on sites for select
  using (
    (transaction_id is not null and can_see_transaction(transaction_id))
    or (transaction_id is null and company_id = my_company())
  );

-- 現場をつくる：owner/admin/accounting/field（viewerは不可。04_権限ロール設計.md 2-3章）
create policy sites_insert on sites for insert
  with check (company_id = my_company() and my_role() <> 'viewer');

-- 「削除」は archived_at を立てるだけ（写真を失わない）。owner/adminのみ（同章「現場を削除する」）。
create policy sites_update on sites for update
  using (company_id = my_company() and my_role() in ('owner', 'admin'))
  with check (company_id = my_company() and my_role() in ('owner', 'admin'));

drop policy if exists photos_own_site on photos;

create policy photos_select on photos for select
  using (can_see_site(site_id));

-- 写真を撮る・保存する：owner/admin/field のみ（accounting・viewerは不可。同章）
create policy photos_insert on photos for insert
  with check (can_see_site(site_id) and my_role() in ('owner', 'admin', 'field'));

-- 写真は書類と同じく撮影後に改変できない（sha256で改ざん検知の土台も置いている）。update/deleteのポリシーは設けない＝default deny。

-- ============================================================
-- ストレージ：site-photos バケット（非公開・署名URL）
-- ============================================================

insert into storage.buckets (id, name, public)
values ('site-photos', 'site-photos', false)
on conflict (id) do nothing;

-- オブジェクトのパスは "{site_id}/{photo_id}.jpg" 形式。先頭セグメントで sites を引く。
create policy site_photos_select on storage.objects for select
  using (
    bucket_id = 'site-photos'
    and can_see_site((storage.foldername(name))[1]::uuid)
  );

create policy site_photos_insert on storage.objects for insert
  with check (
    bucket_id = 'site-photos'
    and can_see_site((storage.foldername(name))[1]::uuid)
    and my_role() in ('owner', 'admin', 'field')
  );
