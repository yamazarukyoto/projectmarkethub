"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/components/providers/AuthProvider";

const ADMIN_EMAIL = "yamazarukyoto@gmail.com";

export default function AdminFinancialsPage() {
  const { user: authUser, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && (!authUser || authUser.email !== ADMIN_EMAIL)) {
      router.replace(authUser ? "/" : "/login?redirect=/admin/financials");
    }
  }, [authUser, authLoading, router]);

  if (authLoading || !authUser || authUser.email !== ADMIN_EMAIL) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">売上・出金管理</h1>
      <Card className="p-6">
        <p className="text-gray-500">売上・出金管理機能は現在開発中です。</p>
      </Card>
    </div>
  );
}
