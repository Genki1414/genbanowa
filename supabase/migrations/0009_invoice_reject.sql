-- 請求書の却下（差し戻し）
-- CLAUDE.md「絶対に守ること」4：書類は送信後に変更できない。訂正は差し戻しか新規発行。
-- 注文書には既に rejected_at / reject_note があるが、請求書側に対応するものがなかった。
-- 削除ではなく、差し戻し（status='rejected' として記録は残す）で対応する。

alter table invoices add column rejected_at timestamptz;
alter table invoices add column reject_note text;
