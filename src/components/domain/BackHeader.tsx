"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Header } from "@/components/ui/Header";

export function BackHeader({ title, right }: { title: ReactNode; right?: ReactNode }) {
  const router = useRouter();
  return <Header title={title} back={() => router.back()} right={right} />;
}
