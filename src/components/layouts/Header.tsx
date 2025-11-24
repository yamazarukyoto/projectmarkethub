"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useMode } from "@/components/providers/ModeProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import {
    Briefcase,
    Search,
    Bell,
    MessageSquare,
    User as UserIcon,
    LogOut,
    Settings,
    Menu,
    X
} from "lucide-react";
import { clsx } from "clsx";

export const Header = () => {
    const { mode, setMode } = useMode();
    const { user, firebaseUser, loading } = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const profileMenuRef = useRef<HTMLDivElement>(null);

    const isClient = mode === "client";

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newMode = e.target.value as "client" | "worker";
        setMode(newMode);
        if (newMode === "client") {
            router.push("/client/dashboard");
        } else {
            router.push("/worker/dashboard");
        }
    };

    const handleMobileModeToggle = () => {
        const newMode = mode === "client" ? "worker" : "client";
        setMode(newMode);
        if (newMode === "client") {
            router.push("/client/dashboard");
        } else {
            router.push("/worker/dashboard");
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            router.push("/login");
            router.refresh();
        } catch (error) {
            console.error("Logout error:", error);
        }
    };

    const borderColor = isClient ? "border-primary" : "border-accent";

    const clientLinks = [
        { href: "/client/dashboard", label: "ダッシュボード" },
        { href: "/client/jobs/new", label: "仕事を依頼する" },
    ];

    const workerLinks = [
        { href: "/worker/dashboard", label: "ダッシュボード" },
        { href: "/worker/search", label: "仕事を探す" },
    ];

    const links = isClient ? clientLinks : workerLinks;
    const currentUser = user || firebaseUser;

    return (
        <header className={clsx("sticky top-0 z-50 bg-white shadow-sm border-t-4", borderColor)}>
            <div className="container mx-auto px-4">
                <div className="flex h-16 items-center justify-between">
                    {/* Logo */}
                    <div className="flex items-center gap-8">
                        <Link href="/" className="text-xl font-bold text-secondary">
                            Project Market Hub
                        </Link>

                        {/* Desktop Navigation */}
                        <nav className="hidden md:flex items-center gap-6">
                            {links.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={clsx(
                                        "text-sm font-medium transition-colors hover:text-primary",
                                        pathname === link.href ? "text-primary" : "text-gray-600"
                                    )}
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </nav>
                    </div>

                    {/* Right Side Actions */}
                    <div className="flex items-center gap-4">
                        {/* Mode Switcher */}
                        <div className="hidden md:block">
                            <select
                                value={mode}
                                onChange={handleModeChange}
                                className="text-sm border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                            >
                                <option value="client">クライアントモード</option>
                                <option value="worker">ワーカーモード</option>
                            </select>
                        </div>

                        {loading ? (
                            <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
                        ) : currentUser ? (
                            <>
                                <button className="p-2 text-gray-500 hover:text-primary relative">
                                    <MessageSquare size={20} />
                                    <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full"></span>
                                </button>
                                <button className="p-2 text-gray-500 hover:text-primary relative">
                                    <Bell size={20} />
                                    <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full"></span>
                                </button>

                                {/* Profile Dropdown */}
                                <div className="relative" ref={profileMenuRef}>
                                    <button
                                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                                        className="flex items-center gap-2"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                                            {currentUser.photoURL ? (
                                                <img src={currentUser.photoURL} alt={currentUser.displayName || "User"} className="w-full h-full object-cover" />
                                            ) : (
                                                <UserIcon size={20} className="text-gray-500" />
                                            )}
                                        </div>
                                    </button>

                                    {isProfileOpen && (
                                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 border border-gray-100">
                                            <div className="px-4 py-2 border-b border-gray-100">
                                                <p className="text-sm font-medium text-gray-900">{currentUser.displayName || "User"}</p>
                                                <p className="text-xs text-gray-500 truncate">{currentUser.email}</p>
                                            </div>
                                            <Link 
                                                href="/account/profile" 
                                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                onClick={() => setIsProfileOpen(false)}
                                            >
                                                <Settings size={16} /> 設定
                                            </Link>
                                            <button
                                                onClick={handleLogout}
                                                className="w-full text-left px-4 py-2 text-sm text-danger hover:bg-gray-50 flex items-center gap-2"
                                            >
                                                <LogOut size={16} /> ログアウト
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {/* Desktop Logout Button */}
                                <div className="hidden md:block">
                                    <Button variant="ghost" size="sm" onClick={handleLogout} className="text-danger hover:text-danger hover:bg-red-50">
                                        ログアウト
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Link href="/login">
                                    <Button variant="ghost" size="sm">ログイン</Button>
                                </Link>
                                <Link href="/register">
                                    <Button size="sm">会員登録</Button>
                                </Link>
                            </div>
                        )}

                        {/* Mobile Menu Button */}
                        <button
                            className="md:hidden p-2 text-gray-500"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                        >
                            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMenuOpen && (
                <div className="md:hidden border-t border-gray-100 bg-white">
                    <div className="p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-500">モード切替</span>
                            <button
                                onClick={handleMobileModeToggle}
                                className={clsx(
                                    "px-3 py-1 rounded-full text-xs font-medium",
                                    isClient ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"
                                )}
                            >
                                {isClient ? "クライアント" : "ワーカー"}
                            </button>
                        </div>
                        <nav className="flex flex-col gap-2">
                            {links.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className="block py-2 text-sm font-medium text-gray-700 hover:text-primary"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    {link.label}
                                </Link>
                            ))}
                            {currentUser && (
                                <button
                                    onClick={() => {
                                        handleLogout();
                                        setIsMenuOpen(false);
                                    }}
                                    className="block w-full text-left py-2 text-sm font-medium text-danger hover:bg-red-50"
                                >
                                    ログアウト
                                </button>
                            )}
                            {!currentUser && (
                                <>
                                    <Link
                                        href="/login"
                                        className="block py-2 text-sm font-medium text-gray-700 hover:text-primary"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        ログイン
                                    </Link>
                                    <Link
                                        href="/register"
                                        className="block py-2 text-sm font-medium text-primary hover:text-primary-hover"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        会員登録
                                    </Link>
                                </>
                            )}
                        </nav>
                    </div>
                </div>
            )}
        </header>
    );
};
