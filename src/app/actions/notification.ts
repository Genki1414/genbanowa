"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireActor } from "@/lib/auth";
import { markRead, markAllRead } from "@/lib/supabase/notificationRepo";
import { Result, ok, err } from "@/domain/shared/result";

export async function markNotificationReadAction(id: string): Promise<Result<null>> {
  await requireActor();
  const supabase = await createClient();
  const { error } = await markRead(supabase, id);
  if (error) return err(error.message);
  revalidatePath("/notifications");
  return ok(null);
}

export async function markAllNotificationsReadAction(): Promise<Result<null>> {
  await requireActor();
  const supabase = await createClient();
  const { error } = await markAllRead(supabase);
  if (error) return err(error.message);
  revalidatePath("/notifications");
  return ok(null);
}
