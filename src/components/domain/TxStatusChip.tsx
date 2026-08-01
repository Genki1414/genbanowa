import { Chip } from "@/components/ui/Chip";
import { TONE, C } from "@/styles/tokens";
import { TxDisplayStatus } from "@/domain/transaction/Transaction";

const LABEL: Record<TxDisplayStatus, string> = {
  awaiting_acceptance: "請書待ち",
  in_progress: "進行中",
  completion_requested: "完了申請中",
  completed: "完了",
  cancelled: "中止",
};

const COLOR: Record<TxDisplayStatus, string> = {
  awaiting_acceptance: TONE.active,
  in_progress: TONE.active,
  completion_requested: TONE.active,
  completed: TONE.done,
  cancelled: C.usu,
};

export function TxStatusChip({ status }: { status: TxDisplayStatus }) {
  return (
    <Chip color={COLOR[status]} solid>
      {LABEL[status]}
    </Chip>
  );
}
