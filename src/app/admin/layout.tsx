"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import Link from "next/link";
import { Home, Users, FileText, AlertTriangle, DollarSign, LogOut } from "lucide-react";

// 管理者メールアドレス
const ADMIN_EMAIL = "yamazarukyoto@gmail.com";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [checkComplete, setCheckComplete] = useState(false);

    useEffect(() => {
        // ローディング中は何もしない
        if (loading) return;

        // 認証チェック完了
        setCheckComplete(true);

        if (!user) {
            // 未ログインの場合はログインページへ
            console.log("Admin: No user, redirecting to login");
            router.replace("/login?redirect=/admin");
            return;
        }
        
        if (user.email !== ADMIN_EMAIL) {
            // 管理者でない場合はトップページへ
            console.log("Admin: Not admin email:", user.email);
            alert("管理者権限がありません。");
            router.replace("/");
            return;
        }
        
        // 管理者として認証成功
        console.log("Admin: Authorized as admin");
        setIsAuthorized(true);
    }, [user, loading, router]);

    // ローディング中
    if (loading || !checkComplete) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-gray-600">読み込み中...</p>
                </div>
            </div>
        );
    }

    // 認証チェック中（リダイレクト待ち）
    if (!isAuthorized) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-gray-600">認証確認中...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">
            {/* 管理者ヘッダー */}
            <header className="bg-secondary text-white shadow-lg">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <Link href="/admin" className="text-xl font-bold">
                                🔒 管理画面
                            </Link>
                            <span className="text-sm text-gray-300">
                                ログイン: {user?.email}
                            </span>
                        </div>
                        <Link href="/" className="flex items-center gap-2 text-sm hover:text-gray-300">
                            <LogOut size={16} />
                            サイトに戻る
                        </Link>
                    </div>
                </div>
            </header>

            <div className="flex">
                {/* サイドバー */}
                <aside className="w-64 bg-white shadow-md min-h-[calc(100vh-64px)]">
                    <nav className="p-4">
                        <ul className="space-y-2">
                            <li>
                                <Link 
                                    href="/admin" 
                                    className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 text-gray-700"
                                >
                                    <Home size={20} />
                                    ダッシュボード
                                </Link>
                            </li>
                            <li>
                                <Link 
                                    href="/admin/users" 
                                    className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 text-gray-700"
                                >
                                    <Users size={20} />
                                    ユーザー管理
                                </Link>
                            </li>
                            <li>
                                <Link 
                                    href="/admin/contracts" 
                                    className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 text-gray-700"
                                >
                                    <FileText size={20} />
                                    契約管理
                                </Link>
                            </li>
                            <li>
                                <Link 
                                    href="/admin/reports" 
                                    className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 text-gray-700"
                                >
                                    <AlertTriangle size={20} />
                                    通報管理
                                </Link>
                            </li>
                            <li>
                                <Link 
                                    href="/admin/financials" 
                                    className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 text-gray-700"
                                >
                                    <DollarSign size={20} />
                                    売上・出金管理
                                </Link>
                            </li>
                        </ul>
                    </nav>
                </aside>

                {/* メインコンテンツ */}
                <main className="flex-1 p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
