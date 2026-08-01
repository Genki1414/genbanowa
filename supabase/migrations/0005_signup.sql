-- P0: 会社登録（サインアップ）
-- 出典: 00_CLAUDE_CODE_キックオフ.md 3章Step6 / 01_実装設計書.md 実装順P0
--
-- 新規ユーザーは Supabase Auth でアカウントを作った直後、まだどの会社にも属していない。
-- companies への insert 用ポリシーは用意していない（RLSで「自分の会社」を判定する
-- my_company() 自体が users テーブルに依存しており、会社が存在しない最初の一手を
-- クライアント側のRLSだけで許可する綺麗な方法がないため）。
-- 会社作成とownerユーザーの作成をひとつの SECURITY DEFINER 関数にまとめ、
-- 「認証済みだが未登録」の1回きりの操作として実行する。

create or replace function bootstrap_company(
  p_name text,
  p_type text,
  p_user_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if exists (select 1 from users where id = auth.uid()) then
    raise exception 'already registered';
  end if;
  if p_type not in ('corp', 'sole') then
    raise exception 'invalid type: %', p_type;
  end if;

  insert into companies (name, type)
  values (p_name, p_type)
  returning id into v_company_id;

  insert into users (id, company_id, name, role)
  values (auth.uid(), v_company_id, p_user_name, 'owner');

  return v_company_id;
end;
$$;

revoke execute on function bootstrap_company(text, text, text) from public;
grant execute on function bootstrap_company(text, text, text) to authenticated;
