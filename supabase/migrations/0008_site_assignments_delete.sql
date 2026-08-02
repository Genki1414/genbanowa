-- 現場担当の割り当て解除（DELETE）を許可する。0004で SELECT/INSERT のみ許可していたのを補う。
-- 出典: 04_権限ロール設計.md 3章「割り当ては owner / admin / accounting が行う」

create policy site_assignments_manage_delete on site_assignments for delete
  using (is_tx_party(transaction_id));
