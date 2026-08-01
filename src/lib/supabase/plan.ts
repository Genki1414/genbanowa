import { PLANS, PlanLimits, PlanKey } from "@/domain/plan/Plan";
import { Client } from "./transactionRepo";

export async function getCompanyPlan(supabase: Client, companyId: string): Promise<PlanLimits> {
  const { data } = await supabase.from("companies").select("plan").eq("id", companyId).maybeSingle();
  const key = (data?.plan ?? "free") as PlanKey;
  return PLANS[key];
}
