import Link from "next/link";
import { C } from "@/styles/tokens";
import { SignupForm } from "@/components/domain/SignupForm";

export default function SignupPage() {
  return (
    <div className="min-h-screen" style={{ background: C.yojo }}>
      <div className="flex items-center px-3 h-14" style={{ background: C.sumi }}>
        <h1 className="text-[17px] font-extrabold" style={{ color: "#fff" }}>ゲンバノワ</h1>
      </div>
      <main className="max-w-md mx-auto p-3">
        <h2 className="text-[16px] font-extrabold mb-3" style={{ color: C.sumi }}>アカウントを作成</h2>
        <SignupForm />
        <p className="text-[12px] mt-4" style={{ color: C.usu }}>
          すでにアカウントをお持ちの方は{" "}
          <Link href="/login" className="font-bold underline" style={{ color: C.sumi }}>
            ログイン
          </Link>
        </p>
      </main>
    </div>
  );
}
