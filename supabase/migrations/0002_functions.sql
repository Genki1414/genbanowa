-- ゲンバノワ 特権処理・共通関数
-- 出典: docs/01_実装設計書.md 1-10章・2章、docs/04_権限ロール設計.md

-- 現在ログイン中のユーザーが属する会社
create or replace function my_company()
returns uuid
language sql
stable
as $$
  select company_id from users where id = auth.uid();
$$;

-- 現在ログイン中のユーザーのロール
create or replace function my_role()
returns text
language sql
stable
as $$
  select role from users where id = auth.uid();
$$;

-- 住所文字列から都道府県だけを取り出す（companies_public ビューで使用）
create or replace function area_pref(addr text)
returns text
language sql
immutable
as $$
  select coalesce(substring(addr from '^.{2,3}?[都道府県]'), addr);
$$;

-- 段階開放。追加のみ。同じキーを何度呼んでも増えない（冪等）
create or replace function unlock_feature(p_company uuid, p_key text)
returns void
language sql
security definer
set search_path = public
as $$
  update companies
     set unlocked_features = array(select distinct unnest(unlocked_features || p_key))
   where id = p_company;
$$;

-- スカウト・見積依頼の閲覧ポイント消費（無料プラン用）。
-- scouts.opened_at が未設定のときだけ1回だけ消費する＝冪等。
create or replace function consume_invite_point(p_scout_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_scout scouts%rowtype;
  v_plan text;
begin
  select * into v_scout from scouts where id = p_scout_id for update;
  if v_scout.id is null then
    return;
  end if;
  if v_scout.opened_at is not null then
    return; -- 既に消費済み
  end if;

  select plan into v_plan from companies where id = v_scout.to_company;
  if v_plan = 'free' then
    update companies
       set invite_points = greatest(0, invite_points - 1)
     where id = v_scout.to_company;
  end if;

  update scouts set opened_at = now() where id = p_scout_id;
end;
$$;

-- 信用スコアの再計算。trust_documents の承認状態変更時、取引完了時に呼ぶ。
create or replace function recalc_trust_score(p_company uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_doc_score int;
  v_partner_count int;
  v_score int;
  v_level text;
begin
  select coalesce(sum(p.points), 0)
    into v_doc_score
    from trust_documents d
    join trust_doc_points p on p.kind = d.kind
   where d.company_id = p_company and d.status = 'approved';

  select count(distinct partner)
    into v_partner_count
    from (
      select uke_company as partner from transactions
       where moto_company = p_company and status = 'completed'
      union
      select moto_company as partner from transactions
       where uke_company = p_company and status = 'completed'
    ) t;

  v_score := v_doc_score + least(20, v_partner_count);
  v_level := case
    when v_score >= 80 then 'Platinum'
    when v_score >= 60 then 'Gold'
    when v_score >= 40 then 'Silver'
    when v_score >= 20 then 'Bronze'
    else '未認証'
  end;

  update companies set trust_score = v_score, trust_level = v_level where id = p_company;
end;
$$;

-- 遅延の確定記録（運営のみが呼ぶ想定。実行権限はアプリ層の運営チェックで守る）。
-- 期日超過だけでは遅延にしない。ここを通って status='recorded' になったものだけが信用情報に載る。
create or replace function record_payment_delay(p_dispute_id uuid, p_decision text, p_note text default null)
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
         decision_note = p_note
   where id = p_dispute_id
     and status not in ('recorded', 'resolved'); -- 確定済みへの二重適用を防ぐ
end;
$$;
