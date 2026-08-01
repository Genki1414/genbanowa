import { redirect } from "next/navigation";
import { C } from "@/styles/tokens";
import { CompanyBootstrapForm } from "@/components/domain/CompanyBootstrapForm";
import { createClient } from "@/lib/supabase/server";

export default async function CompanySignupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen" style={{ background: C.yojo }}>
      <div className="flex items-center px-3 h-14" style={{ background: C.sumi }}>
        <h1 className="text-[17px] font-extrabold" style={{ color: "#fff" }}>ゲンバノワ</h1>
      </div>
      <main className="max-w-md mx-auto p-3">
        <h2 className="text-[16px] font-extrabold mb-1" style={{ color: C.sumi }}>会社を登録</h2>
        <p className="text-[12px] mb-3" style={{ color: C.usu }}>
          最初に登録した方が代表者になります。ロールや招待は後から自社ページで変更できます。
        </p>
        <CompanyBootstrapForm />
      </main>
    </div>
  );
}
