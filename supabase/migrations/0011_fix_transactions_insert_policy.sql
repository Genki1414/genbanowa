-- 0004時点の tx_parties_write は is_tx_party(id) で「今まさに挿入しようとしている行自身」を
-- 検索して確認していたが、INSERTのWITH CHECK評価中はその行がまだ他のSELECTから見えないため、
-- 常に false になり "new row violates row-level security policy for table transactions" で失敗していた。
-- orders 等の子テーブル（既存のtransactionを参照するだけ）では問題にならず、
-- transactions 自体の新規作成（P2の createTransactionAction）で初めて顕在化した。
--
-- 新しく挿入される行自身の列を直接見ればよい（conversations_parties_insert と同じパターン）。

drop policy tx_parties_write on transactions;

create policy tx_parties_write on transactions for insert
  with check (moto_company = my_company() or uke_company = my_company());

-- 0004時点でDELETEポリシーが無く、createTransactionAction が注文書作成に失敗したときの
-- ロールバック（作成直後のtransaction行の削除）が「no policy = 拒否」でできなかった。
create policy tx_parties_delete on transactions for delete
  using (is_tx_party(id));
