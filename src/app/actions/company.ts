"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireActor } from "@/lib/auth";
import { Result, ok, err } from "@/domain/shared/result";
import { can } from "@/domain/auth/Permission";
import { insertTrustDocument } from "@/lib/supabase/companyRepo";
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
