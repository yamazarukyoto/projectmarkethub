"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";

export const TopPageButtons = () => {
    const { user, loading } = useAuth();

    if (loading) {
        return <div className="h-12 w-32 bg-white/10 animate-pulse rounded-lg"></div>;
    }

    if (user) {
        return null;
    }

    return (
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="w-full sm:w-auto">
                <Button size="lg" className="w-full text-lg px-8 whitespace-nowrap bg-accent hover:bg-accent/90 text-white border-none">
                    新規登録 <ArrowRight className="ml-2" size={20} />
                </Button>
            </Link>
            <Link href="/login" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full text-lg px-8 border-secondary text-secondary hover:bg-secondary/10 hover:text-secondary whitespace-nowrap">
                    ログイン
                </Button>
            </Link>
        </div>
    );
};
