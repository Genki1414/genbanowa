import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { currentActor } from "@/lib/auth";
import { BottomNav } from "@/components/domain/BottomNav";
import { DevAccountSwitcher } from "@/components/domain/DevAccountSwitcher";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ゲンバノワ",
  description: "仕事が見つかって、取った後の書類まで全部ここで終わる。",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const actor = await currentActor();

  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div className={actor ? "flex-1 pb-14" : "flex-1"}>{children}</div>
        {actor && <BottomNav />}
        {process.env.NODE_ENV !== "production" && <DevAccountSwitcher />}
      </body>
    </html>
  );
}
