-- 自社プロフィール編集画面（P8優先タスク）
-- 出典: ユーザー指摘「建設業許可番号・許可業種・許可の有効期限・社会保険等の加入状況・
-- インボイス登録番号・CCUS事業者IDは資料提出させて」
--
-- これらは trust_documents（kind: kyoka / hoken / invoice / ccus）の運営確認をもって
-- 反映されるべき情報であり、authenticated が自己申告で直接書き換えられる状態は
-- 信用スコアの根拠を偽装できてしまうため塞ぐ。0016_billing.sql で許可した列権限のうち
-- 該当する6列だけを取り消す。

revoke update (
  license_no, license_types, license_expiry, insurance, invoice_no, ccus_id
) on companies from authenticated;
