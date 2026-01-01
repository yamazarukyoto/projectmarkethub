"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { User, Shield, Briefcase, CreditCard, Lock, UserX, UserCircle, Wallet, ExternalLink } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";

export default function AccountLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const { user } = useAuth();

    const menuGroups = [
        {
            title: "共通設定",
            items: [
                { href: "/account/profile", label: "基本情報編集", icon: User },
                { href: "/account/security", label: "パスワード変更", icon: Lock },
                { href: "/account/withdraw", label: "退会申請", icon: UserX },
            ],
        },
        {
            title: "クライアント設定",
            items: [
                { href: "/account/client/profile", label: "クライアントプロフィール", icon: UserCircle },
            ],
        },
        {
            title: "ワーカー設定",
            items: [
                { href: "/account/worker/profile", label: "ワーカープロフィール", icon: Briefcase },
                { href: "/account/worker/payout", label: "報酬", icon: CreditCard },
            ],
        },
    ];

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar */}
                <aside className="w-full md:w-64 flex-shrink-0">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden sticky top-24">
                        {menuGroups.map((group, groupIndex) => (
                            <div key={group.title} className={clsx(groupIndex > 0 && "border-t border-gray-100")}>
                                <div className="px-4 py-3 bg-gray-50/50">
                                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        {group.title}
                                    </h3>
                                </div>
                                <nav className="p-2">
                                    <ul className="space-y-1">
                                        {group.items.map((item) => {
                                            const Icon = item.icon;
                                            const isActive = pathname === item.href;
                                            return (
                                                <li key={item.href}>
                                                    <Link
                                                        href={item.href}
                                                        className={clsx(
                                                            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                                            isActive
                                                                ? "bg-primary/10 text-primary"
                                                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                                        )}
                                                    >
                                                        <Icon size={18} />
                                                        {item.label}
                                                    </Link>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </nav>
                            </div>
                        ))}
                        
                        {/* 公開プロフィールへのリンク */}
                        {user && (
                            <div className="border-t border-gray-100 p-2">
                                <Link
                                    href={`/users/${user.uid}`}
                                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-primary hover:bg-primary/10"
                                >
                                    <ExternalLink size={18} />
                                    公開プロフィールを見る
                                </Link>
                            </div>
                        )}
                    </div>
                </aside>

                {/* Main Content */}
                <div className="flex-grow">
                    {children}
                </div>
            </div>
        </div>
    );
}
