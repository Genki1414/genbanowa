-- 開発用：新規サインアップしたユーザーを、シードの既存の会社に付け替える。
--
-- シードの取引（取引1〜3）は 高橋工業／京葉建設工業／彩北総業／丸和塗装 に紐づいている。
-- 一方、実際にサインアップすると bootstrap_company() が毎回新しい会社を作るため、
-- そのままではRLSでシードの取引が1件も見えない。
-- これは検証用の付け替えで、本番では絶対に使わないこと
-- （bootstrap_company()で正しく作られた自社を書き換えてしまうため）。
--
-- 使い方：v_email と v_company_name を書き換えて、
-- Supabase Dashboard の SQL Editor で実行する。
--
-- 検証シナリオごとに必要な会社（docs/12_検証チェックリスト.md 参照）：
--   シナリオ1・2・3・4 … 高橋工業
--   シナリオ5（人工精算・取引3の請求） … 丸和塗装（取引3の受注側のため）

do $$
declare
  v_email text := 'YOUR_EMAIL_HERE'; -- ← ここを書き換える
  v_company_name text := '高橋工業'; -- ← ここを書き換える（高橋工業 / 丸和塗装 など）
  v_user_id uuid;
  v_old_company_id uuid;
  v_target_company_id uuid;
begin
  select u.id, u.company_id into v_user_id, v_old_company_id
    from users u
    join auth.users au on au.id = u.id
   where au.email = v_email;

  if v_user_id is null then
    raise exception 'ユーザーが見つかりません（%）。先にサインアップと会社登録（/signup/company）を済ませてください。', v_email;
  end if;

  select id into v_target_company_id from companies where name = v_company_name;
  if v_target_company_id is null then
    raise exception 'シードの「%」が見つかりません。supabase/seed.sql が投入されているか確認してください。', v_company_name;
  end if;

  update users set company_id = v_target_company_id, role = 'owner' where id = v_user_id;

  -- サインアップ時に bootstrap_company() で作られた空の会社（他に誰も属していなければ）を片付ける
  delete from companies
   where id = v_old_company_id
     and id <> v_target_company_id
     and not exists (select 1 from users where company_id = v_old_company_id);
end $$;

-- 確認
select u.id as user_id, u.company_id, c.name as company_name, u.role
  from users u
  join auth.users au on au.id = u.id
  join companies c on c.id = u.company_id
 where au.email = 'YOUR_EMAIL_HERE'; -- ← ここも書き換える
