-- ユーザー招待。
-- 出典: 01_実装設計書.md 実装順P0「ユーザー招待」、04_権限ロール設計.md 5章「招待フロー」。
--
-- supabase.auth.admin.inviteUserByEmail() は auth.users に行が即座に作られる
-- （相手がメールのリンクからパスワードを設定するまでは未確定だが、行自体は先にできる）。
-- 招待した側が渡した company_id / role / name を raw_user_meta_data に載せておき、
-- auth.users の行ができたタイミングでこのトリガが users テーブルへ反映する。
-- bootstrap_company()（自分で会社を作る側）とは別経路であることに注意。

create or replace function handle_invited_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_role text;
  v_name text;
begin
  v_company_id := (new.raw_user_meta_data ->> 'invited_company_id')::uuid;
  v_role := new.raw_user_meta_data ->> 'invited_role';
  v_name := new.raw_user_meta_data ->> 'invited_name';

  if v_company_id is not null and v_role is not null then
    insert into users (id, company_id, name, role)
    values (new.id, v_company_id, coalesce(v_name, ''), v_role)
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_invited on auth.users;
create trigger on_auth_user_created_invited
  after insert on auth.users
  for each row
  execute function handle_invited_user();
