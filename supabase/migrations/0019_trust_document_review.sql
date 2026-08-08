-- P8優先: 信用書類（許可証・保険・インボイス・CCUS）の運営承認フロー
-- 出典: ユーザー指摘「これも提出で。本部側で受け取って、確認完了したら反映させる形で」
--       docs/02_通知設計書.md TRT_APPROVED / TRT_REJECTED
--
-- 建設業許可証（kyoka）と社会保険等（hoken）は単一の value では表現できない複数項目を
-- 申請するため、構造化データ用の列を追加する。invoice / ccus は既存の value（単一文字列）のまま。

alter table trust_documents add column values jsonb;

-- 自己申告の提出・再提出（却下後のみ）。my_company() でスコープするので authenticated に渡してよい。
-- pending / approved 中の書類を黙って上書きできてしまうと「送信後に変更できない」原則に反するため、
-- 既存行が rejected のときだけ上書きし、それ以外（pending/approved）は何もしない（アプリ側は
-- 提出フォーム自体を not_submitted / rejected のときしか出さないので、通常はここに来ない）。
create or replace function submit_trust_document(p_kind text, p_value text, p_values jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into trust_documents (company_id, kind, value, values, status)
  values (my_company(), p_kind, p_value, p_values, 'pending')
  on conflict (company_id, kind) do update
    set value = excluded.value,
        values = excluded.values,
        status = 'pending',
        reviewed_by = null,
        reviewed_at = null,
        reject_note = null,
        created_at = now()
    where trust_documents.status = 'rejected';
end;
$$;

-- 承認：pendingからのみ遷移し、種別ごとにcompaniesへ反映したうえで信用スコアを再計算する。
-- 運営専用（service role経由。Server Action側でactor.isStaffを確認してから呼ぶ）。
create or replace function approve_trust_document(p_doc_id uuid, p_reviewed_by uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_doc trust_documents%rowtype;
begin
  select * into v_doc from trust_documents where id = p_doc_id and status = 'pending';
  if not found then
    return; -- 既に処理済み。二重適用を防ぐため冪等に無視する
  end if;

  update trust_documents
     set status = 'approved', reviewed_by = p_reviewed_by, reviewed_at = now()
   where id = p_doc_id;

  if v_doc.kind = 'kyoka' then
    update companies set
      license_no = v_doc.values ->> 'license_no',
      license_types = case when v_doc.values ? 'license_types'
        then array(select jsonb_array_elements_text(v_doc.values -> 'license_types'))
        else license_types end,
      license_expiry = nullif(v_doc.values ->> 'license_expiry', '')::date
    where id = v_doc.company_id;
  elsif v_doc.kind = 'hoken' then
    update companies set insurance = jsonb_build_object(
      'kenpo', coalesce((v_doc.values ->> 'kenpo')::boolean, false),
      'kounen', coalesce((v_doc.values ->> 'kounen')::boolean, false),
      'koyou', coalesce((v_doc.values ->> 'koyou')::boolean, false),
      'rousai_uwanose', coalesce((v_doc.values ->> 'rousai_uwanose')::boolean, false)
    )
    where id = v_doc.company_id;
  elsif v_doc.kind = 'invoice' then
    update companies set invoice_no = v_doc.value where id = v_doc.company_id;
  elsif v_doc.kind = 'ccus' then
    update companies set ccus_id = v_doc.value where id = v_doc.company_id;
  end if;

  perform recalc_trust_score(v_doc.company_id);
end;
$$;

-- 却下：pendingからのみ遷移する。運営専用。
create or replace function reject_trust_document(p_doc_id uuid, p_reviewed_by uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update trust_documents
     set status = 'rejected', reviewed_by = p_reviewed_by, reviewed_at = now(), reject_note = p_note
   where id = p_doc_id and status = 'pending';
end;
$$;

revoke execute on function submit_trust_document(text, text, jsonb) from public;
revoke execute on function approve_trust_document(uuid, uuid) from public;
revoke execute on function reject_trust_document(uuid, uuid, text) from public;

grant execute on function submit_trust_document(text, text, jsonb) to authenticated;
-- approve_trust_document / reject_trust_document は authenticated に渡さない（運営専用、service role経由）。
