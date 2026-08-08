"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireActor } from "@/lib/auth";
import { Result, ok, err } from "@/domain/shared/result";
import { can } from "@/domain/auth/Permission";
import { insertTrustDocument, loadOwnCompanyProfile, updateCompanyProfile } from "@/lib/supabase/companyRepo";
import { CompanyEditableProfile } from "@/domain/company/Company";
import { TrustDocKind } from "@/lib/supabase/database.types";

export async function submitTrustDocumentAction(kind: TrustDocKind, value: string | undefined): Promise<Result<null>> {
  const actor = await requireActor();
  if (!can(actor.role, "trustDocument.submit")) return err("PERMISSION_DENIED");

  const supabase = await createClient();
  const { error } = await insertTrustDocument(supabase, actor.companyId, kind, value);
  if (error) return err(error.message);

  revalidatePath(`/companies/${actor.companyId}`);
  return ok(null);
}

/**
 * 自社プロフィールの編集。owner/admin/accountingのみ（04_権限ロール設計.md「自社プロフィールを編集」）。
 * ただし invoiceApprovalLimit（経理が単独で承認できる金額の上限）は、accounting自身が
 * 自分の承認上限を書き換えられると意味がなくなるため owner/admin 限定にする。
 */
export async function updateCompanyProfileAction(input: CompanyEditableProfile): Promise<Result<null>> {
  const actor = await requireActor();
  if (!can(actor.role, "company.edit")) return err("PERMISSION_DENIED");
  if (!input.name.trim()) return err("NAME_REQUIRED");

  const supabase = await createClient();

  let toSave = input;
  if (actor.role !== "owner" && actor.role !== "admin") {
    const current = await loadOwnCompanyProfile(supabase, actor.companyId);
    if (!current) return err("COMPANY_NOT_FOUND");
    toSave = { ...input, invoiceApprovalLimit: current.invoiceApprovalLimit };
  }

  const { error } = await updateCompanyProfile(supabase, actor.companyId, toSave);
  if (error) return err(error.message);

  revalidatePath(`/companies/${actor.companyId}`);
  revalidatePath("/me/company");
  return ok(null);
}
