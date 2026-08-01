import Link from "next/link";
import { C } from "@/styles/tokens";
import { LoginForm } from "@/components/domain/LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen" style={{ background: C.yojo }}>
      <div className="flex items-center px-3 h-14" style={{ background: C.sumi }}>
        <h1 className="text-[17px] font-extrabold" style={{ color: "#fff" }}>ゲンバノワ</h1>
      </div>
      <main className="max-w-md mx-auto p-3">
        <h2 className="text-[16px] font-extrabold mb-3" style={{ color: C.sumi }}>ログイン</h2>
        <LoginForm />
        <p className="text-[12px] mt-4" style={{ color: C.usu }}>
          はじめての方は{" "}
          <Link href="/signup" className="font-bold underline" style={{ color: C.sumi }}>
            アカウントを作成
          </Link>
        </p>
      </main>
    </div>
  );
}
