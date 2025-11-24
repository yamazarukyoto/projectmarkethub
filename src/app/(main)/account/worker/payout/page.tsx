"use client";

import React, { useState, Suspense } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { CreditCard, CheckCircle, ExternalLink } from "lucide-react";
import { useSearchParams } from "next/navigation";

function PaymentSettingsContent() {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const success = searchParams.get("success");
    const [loading, setLoading] = useState(false);

    const handleConnectStripe = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const response = await fetch("/api/stripe/connect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: user.uid }),
            });
            const data = await response.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                alert("エラーが発生しました。");
            }
        } catch (error) {
            console.error(error);
            alert("エラーが発生しました。");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold text-secondary mb-6">報酬受取設定</h1>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CreditCard /> Stripe連携
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-gray-600 mb-6">
                        報酬を受け取るためには、Stripeアカウントとの連携が必要です。
                        以下のボタンから連携手続きを行ってください。
                    </p>

                    {user?.stripeAccountId || success ? (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                            <CheckCircle className="text-green-600" size={24} />
                            <div>
                                <p className="font-bold text-green-800">連携済み</p>
                                <p className="text-sm text-green-700">報酬の受け取りが可能です。</p>
                            </div>
                        </div>
                    ) : (
                        <Button onClick={handleConnectStripe} disabled={loading} className="w-full md:w-auto">
                            {loading ? "処理中..." : "Stripeと連携する"} <ExternalLink size={16} className="ml-2" />
                        </Button>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default function PaymentSettingsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <PaymentSettingsContent />
        </Suspense>
    );
}
