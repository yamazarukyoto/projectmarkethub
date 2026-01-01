"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/components/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const ADMIN_EMAIL = "yamazarukyoto@gmail.com";

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.email !== ADMIN_EMAIL)) {
      router.replace(user ? "/" : "/login?redirect=/admin");
    }
  }, [user, loading, router]);

  if (loading || !user || user.email !== ADMIN_EMAIL) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">管理画面</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/admin/users">
          <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
            <h2 className="text-xl font-semibold mb-2">ユーザー管理</h2>
            <p className="text-gray-600">登録ユーザーの一覧確認、ステータス変更など</p>
          </Card>
        </Link>
        <Link href="/admin/contracts">
          <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
            <h2 className="text-xl font-semibold mb-2">契約管理</h2>
            <p className="text-gray-600">契約一覧確認、トラブル対応など</p>
          </Card>
        </Link>
        <Link href="/admin/reports">
          <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
            <h2 className="text-xl font-semibold mb-2">通報管理</h2>
            <p className="text-gray-600">ユーザーからの通報一覧、対応状況管理</p>
          </Card>
        </Link>
        <Link href="/admin/financials">
          <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
            <h2 className="text-xl font-semibold mb-2">売上・出金管理</h2>
            <p className="text-gray-600">売上集計、Stripe残高確認など</p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
