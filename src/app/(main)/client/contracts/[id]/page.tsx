"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { updateContractStatus } from "@/lib/db";
import { Contract } from "@/types";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ArrowLeft, CheckCircle, Clock, FileText, CreditCard } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { PaymentModal } from "@/components/features/contract/PaymentModal";
import { ReviewModal } from "@/components/features/contract/ReviewModal";
import { updateUserRating } from "@/lib/db";

export default function ClientContractDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const [contract, setContract] = useState<Contract | null>(null);
    const [loading, setLoading] = useState(true);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        const fetchContract = async () => {
            if (params.id) {
                const docRef = doc(db, "contracts", params.id as string);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setContract({ id: docSnap.id, ...docSnap.data() } as Contract);
                }
            }
            setLoading(false);
        };
        fetchContract();
    }, [params.id]);

    const handleEscrow = async () => {
        if (!contract) return;
        setIsProcessing(true);
        try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch("/api/stripe/create-payment-intent", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ contractId: contract.id }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            
            if (data.skipped) {
                setContract({ ...contract, status: 'escrow' });
                alert("仮払い（デモ）が完了しました。");
                return;
            }

            setClientSecret(data.clientSecret);
            setIsPaymentModalOpen(true);
        } catch (error) {
            console.error("Error creating payment intent:", error);
            alert("仮払い準備中にエラーが発生しました。");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCapture = async () => {
        if (!contract) return;
        if (!confirm("検収を完了し、支払いを確定しますか？")) return;
        
        setIsProcessing(true);
        try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch("/api/stripe/capture-payment-intent", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ contractId: contract.id }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            if (data.skipped) {
                setContract({ ...contract, status: 'completed' });
                alert("検収（デモ）が完了し、支払いが確定しました。");
                setIsReviewModalOpen(true); // Open review modal
                return;
            }

            setContract({ ...contract, status: 'completed' });
            alert("検収が完了し、支払いが確定しました。");
            setIsReviewModalOpen(true); // Open review modal
        } catch (error) {
            console.error("Error capturing payment:", error);
            alert("支払い確定処理中にエラーが発生しました。");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReviewSubmit = async (rating: number, comment: string) => {
        if (!contract) return;
        // In a real app, we would save the review to a 'reviews' collection
        // and update the user's average rating.
        // For now, we just update the user rating directly for simplicity.
        // Note: This should ideally be done via an API to ensure security and atomicity.
        
        try {
            // Mock calculation: just set the new rating (in reality, calculate average)
            await updateUserRating(contract.workerId, rating, 1); // 1 is dummy count increment
            alert("評価を送信しました。");
        } catch (error) {
            console.error("Error submitting review:", error);
            alert("評価の送信に失敗しました。");
        }
    };

    if (loading) return <div className="p-8 text-center">読み込み中...</div>;
    if (!contract) return <div className="p-8 text-center">契約が見つかりません</div>;

    return (
        <div className="container mx-auto px-4 py-8">
            <Button variant="ghost" className="mb-4 pl-0" onClick={() => router.back()}>
                <ArrowLeft size={20} className="mr-2" />
                戻る
            </Button>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-2xl font-bold text-secondary">契約詳細</CardTitle>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${contract.status === 'completed' ? 'bg-green-100 text-green-800' :
                                contract.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                    'bg-yellow-100 text-yellow-800'
                            }`}>
                            {contract.status === 'completed' ? '完了' :
                                contract.status === 'in_progress' ? '進行中' :
                                    contract.status === 'escrow' ? '仮払い待ち' : contract.status}
                        </span>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="text-sm font-semibold text-gray-500 mb-1">案件名</h3>
                            <p className="text-lg font-medium">{contract.jobTitle}</p>
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-gray-500 mb-1">契約タイプ</h3>
                            <p className="text-lg font-medium">
                                {contract.jobType === 'project' && 'プロジェクト方式'}
                                {contract.jobType === 'competition' && 'コンペ方式'}
                                {contract.jobType === 'task' && 'タスク方式'}
                            </p>
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-gray-500 mb-1">
                                契約金額
                            </h3>
                            <p className="text-lg font-medium">
                                {contract.amount.toLocaleString()}円
                            </p>
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-gray-500 mb-1">契約日</h3>
                            <p className="text-gray-700">{contract.createdAt.toDate().toLocaleDateString()}</p>
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-gray-500 mb-1">ステータス</h3>
                            <div className="flex items-center gap-2">
                                {contract.status === 'escrow' && <Clock size={16} className="text-yellow-600" />}
                                {contract.status === 'in_progress' && <FileText size={16} className="text-blue-600" />}
                                {contract.status === 'completed' && <CheckCircle size={16} className="text-green-600" />}
                                <span>
                                    {contract.status === 'waiting_for_escrow' ? '仮払い待ち' :
                                     contract.status === 'escrow' ? '仮払い済み・業務開始待ち' :
                                     contract.status === 'in_progress' ? '業務進行中' :
                                     contract.status === 'submitted' ? '納品確認待ち' :
                                     contract.status === 'completed' ? '契約完了' : contract.status}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 仮払いボタン */}
                    {contract.status === 'waiting_for_escrow' && (
                        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                            <h4 className="font-bold text-yellow-900 mb-2">仮払い手続きが必要です</h4>
                            <p className="text-sm text-yellow-800 mb-4">
                                業務を開始するには、まず仮払い（エスクロー）を行う必要があります。
                                仮払いが完了すると、ワーカーに業務開始の通知が送られます。
                            </p>
                            <Button onClick={handleEscrow} disabled={isProcessing} className="bg-accent hover:bg-accent/90 text-white">
                                <CreditCard size={16} className="mr-2" />
                                仮払いへ進む
                            </Button>
                        </div>
                    )}

                    {contract.status === 'submitted' && (
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                            <h4 className="font-bold text-blue-900 mb-2">納品物が提出されました</h4>
                            <p className="text-sm text-blue-800 mb-4">
                                ワーカーから納品報告がありました。内容を確認し、問題なければ検収を完了してください。
                            </p>
                            <Button onClick={handleCapture} disabled={isProcessing}>
                                検収完了（支払いを確定）
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {clientSecret && (
                <PaymentModal
                    isOpen={isPaymentModalOpen}
                    onClose={() => setIsPaymentModalOpen(false)}
                    clientSecret={clientSecret}
                    onSuccess={() => {
                        setIsPaymentModalOpen(false);
                        setContract({ ...contract, status: 'escrow' });
                        alert("仮払いが完了しました。");
                    }}
                />
            )}

            <ReviewModal
                isOpen={isReviewModalOpen}
                onClose={() => setIsReviewModalOpen(false)}
                onSubmit={handleReviewSubmit}
            />
        </div>
    );
}
