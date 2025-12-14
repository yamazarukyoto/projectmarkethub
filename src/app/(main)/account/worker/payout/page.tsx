"use client";

import React, { useState, useEffect, Suspense, useCallback } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { CreditCard, CheckCircle, ExternalLink, History, Wallet, AlertCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface CompletedContract {
    id: string;
    jobTitle: string;
    workerReceiveAmount: number;
    completedAt: Date | null;
    stripeTransferId?: string;
}

function PaymentSettingsContent() {
    const { user, firebaseUser } = useAuth();
    const searchParams = useSearchParams();
    const success = searchParams.get("success");
    const [loading, setLoading] = useState(false);
    const [dashboardLoading, setDashboardLoading] = useState(false);
    const [completedContracts, setCompletedContracts] = useState<CompletedContract[]>([]);
    const [contractsLoading, setContractsLoading] = useState(true);
    const [totalEarnings, setTotalEarnings] = useState(0);

    // 完了した契約（報酬履歴）を取得
    const fetchCompletedContracts = useCallback(async () => {
        if (!user) return;
        
        setContractsLoading(true);
        try {
            const contractsRef = collection(db, "contracts");
            const q = query(
                contractsRef,
                where("workerId", "==", user.uid),
                where("status", "==", "completed"),
                orderBy("completedAt", "desc")
            );
            const snapshot = await getDocs(q);
            
            const contracts: CompletedContract[] = [];
            let total = 0;
            
            snapshot.forEach((doc) => {
                const data = doc.data();
                const contract: CompletedContract = {
                    id: doc.id,
                    jobTitle: data.jobTitle || "案件名なし",
                    workerReceiveAmount: data.workerReceiveAmount || 0,
                    completedAt: data.completedAt?.toDate() || null,
                    stripeTransferId: data.stripeTransferId,
                };
                contracts.push(contract);
                total += contract.workerReceiveAmount;
            });
            
            setCompletedContracts(contracts);
            setTotalEarnings(total);
        } catch (error) {
            console.error("Error fetching completed contracts:", error);
        } finally {
            setContractsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchCompletedContracts();
    }, [fetchCompletedContracts]);

    const handleConnectStripe = async () => {
        if (!user || !firebaseUser) return;
        setLoading(true);
        try {
            const token = await firebaseUser.getIdToken();
            const response = await fetch("/api/stripe/connect", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ userId: user.uid }),
            });
            const data = await response.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                console.error("Stripe Connect Error:", data);
                alert(`エラーが発生しました: ${data.error || "不明なエラー"}`);
            }
        } catch (error) {
            console.error(error);
            alert("通信エラーが発生しました。");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDashboard = async () => {
        if (!user || !firebaseUser) return;
        setDashboardLoading(true);
        try {
            const token = await firebaseUser.getIdToken();
            const response = await fetch("/api/stripe/connect", {
                method: "GET",
                headers: { 
                    "Authorization": `Bearer ${token}`
                },
            });
            const data = await response.json();
            
            if (data.isDemo) {
                alert(data.message || "デモモードのため、Stripeダッシュボードは利用できません。");
            } else if (data.url) {
                window.open(data.url, "_blank");
            } else if (data.error) {
                alert(`エラーが発生しました: ${data.error}`);
            }
        } catch (error) {
            console.error(error);
            alert("通信エラーが発生しました。");
        } finally {
            setDashboardLoading(false);
        }
    };

    const formatDate = (date: Date | null) => {
        if (!date) return "-";
        return date.toLocaleDateString("ja-JP", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("ja-JP", {
            style: "currency",
            currency: "JPY",
        }).format(amount);
    };

    const isConnected = user?.stripeAccountId || success;

    return (
        <div className="container mx-auto px-4 py-8 space-y-6">
            <h1 className="text-2xl font-bold text-secondary mb-6">報酬受取設定</h1>

            {/* Stripe連携カード */}
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

                    {isConnected ? (
                        <div className="space-y-4">
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                                <CheckCircle className="text-green-600" size={24} />
                                <div>
                                    <p className="font-bold text-green-800">連携済み</p>
                                    <p className="text-sm text-green-700">報酬の受け取りが可能です。</p>
                                </div>
                            </div>
                            
                            <Button 
                                onClick={handleOpenDashboard} 
                                disabled={dashboardLoading}
                                variant="outline"
                                className="w-full md:w-auto"
                            >
                                {dashboardLoading ? "読み込み中..." : "Stripeダッシュボードを開く"} 
                                <ExternalLink size={16} className="ml-2" />
                            </Button>
                            <p className="text-sm text-gray-500">
                                ※ Stripeダッシュボードで、入金履歴や銀行口座の設定を確認・変更できます。
                            </p>
                        </div>
                    ) : (
                        <Button onClick={handleConnectStripe} disabled={loading} className="w-full md:w-auto">
                            {loading ? "処理中..." : "Stripeと連携する"} <ExternalLink size={16} className="ml-2" />
                        </Button>
                    )}
                </CardContent>
            </Card>

            {/* 報酬サマリーカード */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Wallet /> 報酬サマリー
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-primary/10 rounded-lg p-4">
                            <p className="text-sm text-gray-600">累計報酬額</p>
                            <p className="text-2xl font-bold text-primary">
                                {formatCurrency(totalEarnings)}
                            </p>
                        </div>
                        <div className="bg-gray-100 rounded-lg p-4">
                            <p className="text-sm text-gray-600">完了案件数</p>
                            <p className="text-2xl font-bold text-secondary">
                                {completedContracts.length} 件
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 報酬履歴カード */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <History /> 報酬履歴
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {contractsLoading ? (
                        <div className="text-center py-8 text-gray-500">
                            読み込み中...
                        </div>
                    ) : completedContracts.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <AlertCircle className="mx-auto mb-2" size={32} />
                            <p>まだ完了した案件がありません。</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-3 px-2 text-sm font-medium text-gray-600">案件名</th>
                                        <th className="text-right py-3 px-2 text-sm font-medium text-gray-600">報酬額</th>
                                        <th className="text-right py-3 px-2 text-sm font-medium text-gray-600">完了日</th>
                                        <th className="text-center py-3 px-2 text-sm font-medium text-gray-600">ステータス</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {completedContracts.map((contract) => (
                                        <tr key={contract.id} className="border-b hover:bg-gray-50">
                                            <td className="py-3 px-2">
                                                <span className="font-medium">{contract.jobTitle}</span>
                                            </td>
                                            <td className="py-3 px-2 text-right">
                                                <span className="font-bold text-primary">
                                                    {formatCurrency(contract.workerReceiveAmount)}
                                                </span>
                                            </td>
                                            <td className="py-3 px-2 text-right text-sm text-gray-600">
                                                {formatDate(contract.completedAt)}
                                            </td>
                                            <td className="py-3 px-2 text-center">
                                                {contract.stripeTransferId ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                                        <CheckCircle size={12} />
                                                        送金済み
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                                                        処理中
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 注意事項 */}
            <Card>
                <CardContent className="pt-6">
                    <h3 className="font-bold text-secondary mb-3">報酬受取に関する注意事項</h3>
                    <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
                        <li>報酬は、クライアントが検収を完了した時点でStripeアカウントに送金されます。</li>
                        <li>Stripeから銀行口座への入金は、通常2〜3営業日かかります。</li>
                        <li>報酬額からシステム手数料（5%+税）が差し引かれた金額が受取額となります。</li>
                        <li>銀行口座情報の変更は、Stripeダッシュボードから行ってください。</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}

export default function PaymentSettingsPage() {
    return (
        <Suspense fallback={<div className="container mx-auto px-4 py-8">Loading...</div>}>
            <PaymentSettingsContent />
        </Suspense>
    );
}
