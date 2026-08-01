import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { currentActor } from "@/lib/auth";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const actor = await currentActor();
  if (!actor) redirect("/signup/company");

  redirect("/transactions");
}
