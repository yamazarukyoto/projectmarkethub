"use client";

import React, { useState, useEffect, Suspense, useCallback, useMemo } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { CreditCard, CheckCircle, ExternalLink, History, Wallet, AlertCircle, Download, FileText, Calendar } from "lucide-react";
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
    const [stripeStatus, setStripeStatus] = useState<any>(null);
    const [statusLoading, setStatusLoading] = useState(true);
    
    // 期間フィルター用のstate
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState<number | "all">("all");
    const [selectedMonth, setSelectedMonth] = useState<number | "all">("all");
    // 支払調書用の年選択state
    const [paymentStatementYear, setPaymentStatementYear] = useState<number>(currentYear);

    // 利用可能な年のリストを生成（データがある年のみ）
    const availableYears = useMemo(() => {
        const years = new Set<number>();
        completedContracts.forEach((contract) => {
            if (contract.completedAt) {
                years.add(contract.completedAt.getFullYear());
            }
        });
        return Array.from(years).sort((a, b) => b - a); // 降順
    }, [completedContracts]);

    // 支払調書の年を初期化
    useEffect(() => {
        if (availableYears.length > 0 && !availableYears.includes(paymentStatementYear)) {
            setPaymentStatementYear(availableYears[0]);
        }
    }, [availableYears, paymentStatementYear]);

    // フィルタリングされた契約リスト
    const filteredContracts = useMemo(() => {
        return completedContracts.filter((contract) => {
            if (!contract.completedAt) return selectedYear === "all";
            
            const contractYear = contract.completedAt.getFullYear();
            const contractMonth = contract.completedAt.getMonth() + 1; // 0-indexed to 1-indexed
            
            if (selectedYear !== "all" && contractYear !== selectedYear) {
                return false;
            }
            if (selectedMonth !== "all" && contractMonth !== selectedMonth) {
                return false;
            }
            return true;
        });
    }, [completedContracts, selectedYear, selectedMonth]);

    // フィルタリングされた期間の合計
    const filteredTotal = useMemo(() => {
        return filteredContracts.reduce((sum, contract) => sum + contract.workerReceiveAmount, 0);
    }, [filteredContracts]);

    // 年間支払調書PDFダウンロード
    const handleDownloadPaymentStatement = async (year: number) => {
        if (!user) return;
        
        // 指定年のデータをフィルタリング
        const yearContracts = completedContracts.filter((contract) => {
            if (!contract.completedAt) return false;
            return contract.completedAt.getFullYear() === year;
        });

        if (yearContracts.length === 0) {
            alert(`${year}年のデータがありません。`);
            return;
        }

        const yearTotal = yearContracts.reduce((sum, c) => sum + c.workerReceiveAmount, 0);

        // PDF生成（動的インポート）
        const { generatePaymentStatementPDF } = await import("@/lib/pdf-generator");
        await generatePaymentStatementPDF({
            year,
            workerName: user.displayName || user.email || "N/A",
            totalAmount: yearTotal,
            contracts: yearContracts.map((c) => ({
                jobTitle: c.jobTitle,
                amount: c.workerReceiveAmount,
                completedAt: c.completedAt || new Date(),
            })),
        });
    };

    // Stripeアカウントの状態を取得
    const fetchStripeStatus = useCallback(async () => {
        if (!user || !firebaseUser) return;
        setStatusLoading(true);
        try {
            const token = await firebaseUser.getIdToken();
            const res = await fetch("/api/stripe/account-status", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            setStripeStatus(data);
        } catch (error) {
            console.error("Error fetching stripe status:", error);
        } finally {
            setStatusLoading(false);
        }
    }, [user, firebaseUser]);

    useEffect(() => {
        fetchStripeStatus();
    }, [fetchStripeStatus]);

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
                // workerReceiveAmountが存在しない場合は0として扱う
                // amountから手数料を引いた額を計算するフォールバックも検討可能だが、
                // 基本的にはDBに保存されているはず
                const amount = data.workerReceiveAmount || 0;
                
                const contract: CompletedContract = {
                    id: doc.id,
                    jobTitle: data.jobTitle || "案件名なし",
                    workerReceiveAmount: amount,
                    completedAt: data.completedAt?.toDate() || null,
                    stripeTransferId: data.stripeTransferId,
                };
                contracts.push(contract);
                total += amount;
            });
            
            console.log("Fetched contracts:", contracts); // Debug log
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
            } else if (data.isOnboarding) {
                // Onboarding未完了（または要件不足）の場合
                // ユーザーに確認を求めず、メッセージを表示して直接遷移させる（「開かない」を防ぐため）
                alert(data.message || "Stripeアカウントの設定が必要です。設定画面へ移動します。");
                window.location.href = data.url;
            } else if (data.url) {
                // ログインリンクの場合
                // ポップアップブロック対策: まず新しいタブで開き、失敗したら現在のタブで開く
                const newWindow = window.open(data.url, "_blank");
                if (!newWindow || newWindow.closed || typeof newWindow.closed == 'undefined') {
                    // ポップアップがブロックされた場合、確認なしで現在のタブで開く
                    window.location.href = data.url;
                }
            } else if (data.error) {
                console.error("Stripe Dashboard Error:", data);
                alert(`Stripeダッシュボードを開けませんでした。\nエラー: ${data.error}\nコード: ${data.code || 'unknown'}`);
            }
        } catch (error) {
            console.error(error);
            alert("通信エラーが発生しました。もう一度お試しください。");
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

    // CSV出力機能
    const handleExportCSV = () => {
        if (completedContracts.length === 0) {
            alert("出力するデータがありません。");
            return;
        }

        // CSVヘッダー
        const headers = ["案件名", "報酬額", "完了日", "ステータス"];
        
        // CSVデータ行
        const rows = completedContracts.map((contract) => {
            const status = contract.stripeTransferId ? "送金済み" : "処理中";
            const completedDate = contract.completedAt 
                ? contract.completedAt.toLocaleDateString("ja-JP", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                })
                : "-";
            return [
                `"${contract.jobTitle.replace(/"/g, '""')}"`, // ダブルクォートをエスケープ
                contract.workerReceiveAmount.toString(),
                completedDate,
                status,
            ];
        });

        // CSV文字列を生成
        const csvContent = [
            headers.join(","),
            ...rows.map((row) => row.join(",")),
        ].join("\n");

        // BOM付きUTF-8でエンコード（Excelで文字化けしないように）
        const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
        const blob = new Blob([bom, csvContent], { type: "text/csv;charset=utf-8;" });

        // ダウンロード
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        const now = new Date();
        const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
        link.download = `報酬履歴_${dateStr}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const isConnected = stripeStatus?.connected;
    const isRestricted = stripeStatus?.status === 'restricted' || stripeStatus?.status === 'incomplete';

    return (
        <div className="container mx-auto px-4 py-8 space-y-6">
            <h1 className="text-2xl font-bold text-secondary mb-6">報酬・本人確認</h1>

            {/* Stripe連携カード */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CreditCard /> Stripe連携（本人確認）
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-gray-600 mb-6">
                        報酬の受け取りおよび本人確認のために、Stripeアカウントとの連携が必要です。
                        以下のボタンから連携手続きを行ってください。<br />
                        <span className="text-sm text-gray-500">※ Stripeでの本人確認（KYC）完了をもって、本プラットフォームの本人確認完了とみなします。</span>
                    </p>

                    {statusLoading ? (
                        <div className="text-center py-4">読み込み中...</div>
                    ) : isConnected ? (
                        <div className="space-y-4">
                            {isRestricted ? (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
                                    <AlertCircle className="text-yellow-600" size={24} />
                                    <div>
                                        <p className="font-bold text-yellow-800">追加情報が必要です</p>
                                        <p className="text-sm text-yellow-700">
                                            報酬を受け取るには、Stripeダッシュボードで本人確認情報や銀行口座情報を完了させる必要があります。
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                                    <CheckCircle className="text-green-600" size={24} />
                                    <div>
                                        <p className="font-bold text-green-800">連携済み（本人確認完了）</p>
                                        <p className="text-sm text-green-700">報酬の受け取りが可能です。</p>
                                    </div>
                                </div>
                            )}
                            
                            <Button 
                                onClick={handleOpenDashboard} 
                                disabled={dashboardLoading}
                                variant={isRestricted ? "primary" : "outline"}
                                className="w-full md:w-auto"
                            >
                                {dashboardLoading ? "読み込み中..." : isRestricted ? "設定を完了する" : "Stripeダッシュボードを開く"} 
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

            {/* 期間別サマリー・支払調書カード */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar /> 期間別サマリー・支払調書
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* 期間フィルター */}
                    <div className="flex flex-wrap gap-4 items-end">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">年</label>
                            <select
                                value={selectedYear}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setSelectedYear(value === "all" ? "all" : parseInt(value));
                                    if (value === "all") setSelectedMonth("all");
                                }}
                                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                <option value="all">全期間</option>
                                {availableYears.map((year) => (
                                    <option key={year} value={year}>{year}年</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">月</label>
                            <select
                                value={selectedMonth}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setSelectedMonth(value === "all" ? "all" : parseInt(value));
                                }}
                                disabled={selectedYear === "all"}
                                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
                            >
                                <option value="all">全月</option>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => (
                                    <option key={month} value={month}>{month}月</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* フィルタリング結果 */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div>
                                <p className="text-sm text-blue-700">
                                    {selectedYear === "all" 
                                        ? "全期間" 
                                        : selectedMonth === "all" 
                                            ? `${selectedYear}年` 
                                            : `${selectedYear}年${selectedMonth}月`}
                                    の報酬
                                </p>
                                <p className="text-2xl font-bold text-blue-800">
                                    {formatCurrency(filteredTotal)}
                                </p>
                                <p className="text-sm text-blue-600">
                                    {filteredContracts.length} 件
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 年間支払調書ダウンロード */}
                    {availableYears.length > 0 && (
                        <div className="border-t pt-4">
                            <h4 className="font-medium text-secondary mb-3 flex items-center gap-2">
                                <FileText size={18} />
                                年間支払調書（確定申告用）
                            </h4>
                            <p className="text-sm text-gray-600 mb-3">
                                確定申告に使用できる年間支払調書をPDFでダウンロードできます。
                                <br />
                                <span className="text-xs text-gray-500">※ 暦年（1月1日〜12月31日）ベースで集計されます。</span>
                            </p>
                            <div className="flex items-center gap-4">
                                <select
                                    value={paymentStatementYear}
                                    onChange={(e) => setPaymentStatementYear(parseInt(e.target.value))}
                                    className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                    {availableYears.map((year) => (
                                        <option key={year} value={year}>{year}年分</option>
                                    ))}
                                </select>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDownloadPaymentStatement(paymentStatementYear)}
                                    className="flex items-center gap-2"
                                >
                                    <FileText size={16} />
                                    ダウンロード
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 報酬履歴カード */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <CardTitle className="flex items-center gap-2">
                            <History /> 報酬履歴
                            {(selectedYear !== "all" || selectedMonth !== "all") && (
                                <span className="text-sm font-normal text-gray-500">
                                    （{selectedYear === "all" ? "全期間" : selectedMonth === "all" ? `${selectedYear}年` : `${selectedYear}年${selectedMonth}月`}）
                                </span>
                            )}
                        </CardTitle>
                        {filteredContracts.length > 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleExportCSV}
                                className="flex items-center gap-2"
                            >
                                <Download size={16} />
                                CSV出力
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {contractsLoading ? (
                        <div className="text-center py-8 text-gray-500">
                            読み込み中...
                        </div>
                    ) : filteredContracts.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <AlertCircle className="mx-auto mb-2" size={32} />
                            <p>{completedContracts.length === 0 ? "まだ完了した案件がありません。" : "選択した期間に該当するデータがありません。"}</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            {/* スクロール可能なテーブルコンテナ（最大10件分の高さ） */}
                            <div className="max-h-[480px] overflow-y-auto border rounded-lg">
                                <table className="w-full">
                                    <thead className="sticky top-0 bg-white border-b">
                                        <tr>
                                            <th className="text-left py-3 px-2 text-sm font-medium text-gray-600">案件名</th>
                                            <th className="text-right py-3 px-2 text-sm font-medium text-gray-600">報酬額</th>
                                            <th className="text-right py-3 px-2 text-sm font-medium text-gray-600">完了日</th>
                                            <th className="text-center py-3 px-2 text-sm font-medium text-gray-600">ステータス</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredContracts.map((contract) => (
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
                            {filteredContracts.length > 10 && (
                                <p className="text-sm text-gray-500 mt-2 text-center">
                                    {filteredContracts.length}件中、スクロールで全件表示できます
                                </p>
                            )}
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
                        <li><strong>銀行口座への入金は毎月25日</strong>に行われます。</li>
                        <li><strong>入金手数料（入金額の0.25% + 250円）はワーカー負担</strong>となります。</li>
                        <li>報酬額からシステム手数料（5%）が差し引かれた金額が受取額となります。</li>
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
