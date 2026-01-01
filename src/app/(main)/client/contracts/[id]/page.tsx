"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { updateContractStatus, submitReview } from "@/lib/db";
import { Contract } from "@/types";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ArrowLeft, CheckCircle, Clock, FileText, CreditCard, MessageSquare, AlertCircle, XCircle, AlertTriangle } from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import Link from "next/link";
import { PaymentModal } from "@/components/features/contract/PaymentModal";
import { ReviewModal } from "@/components/features/contract/ReviewModal";

export default function ClientContractDetailPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const [contract, setContract] = useState<Contract | null>(null);
    const [loading, setLoading] = useState(true);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // 決済完了を検証する関数
    const verifyPayment = useCallback(async (contractId: string) => {
        try {
            const token = await auth.currentUser?.getIdToken();
            if (!token) return;
            
            // Use Cloud Run direct URL to bypass domain mapping timeout
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
            const res = await fetch(`${apiUrl}/api/stripe/verify-payment`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ contractId }),
            });
            const data = await res.json();
            if (data.success) {
                console.log("Payment verified successfully");
            } else if (data.error) {
                console.error("Verify payment error:", data.error);
            }
        } catch (error) {
            console.error("Error verifying payment:", error);
        }
    }, []);

    useEffect(() => {
        if (!params.id) return;
        
        const unsubscribe = onSnapshot(doc(db, "contracts", params.id as string), (docSnap) => {
            if (docSnap.exists()) {
                setContract({ id: docSnap.id, ...docSnap.data() } as Contract);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [params.id]);

    // 3Dセキュア認証後のリダイレクト処理
    useEffect(() => {
        const paymentIntentParam = searchParams.get("payment_intent");
        const redirectStatus = searchParams.get("redirect_status");
        
        console.log("3D Secure redirect check:", { paymentIntentParam, redirectStatus, contractId: params.id });
        
        // payment_intentパラメータがあれば、3Dセキュア認証後のリダイレクト
        if (paymentIntentParam && params.id) {
            // URLパラメータをクリア
            const url = new URL(window.location.href);
            url.searchParams.delete("payment_intent");
            url.searchParams.delete("payment_intent_client_secret");
            url.searchParams.delete("redirect_status");
            window.history.replaceState({}, "", url.pathname);
            
            // redirect_statusがsucceededの場合のみ成功
            if (redirectStatus === "succeeded") {
                // 決済完了を検証
                verifyPayment(params.id as string);
                alert("仮決済が完了しました。");
            } else if (redirectStatus === "failed") {
                alert("決済に失敗しました。もう一度お試しください。");
            } else {
                // redirect_statusがない場合も検証を試みる（Stripeの仕様変更対応）
                console.log("No redirect_status, attempting to verify payment anyway");
                verifyPayment(params.id as string);
            }
        }
    }, [searchParams, params.id, verifyPayment]);

    const handleEscrow = async () => {
        console.log("handleEscrow called");
        if (!contract) {
            console.log("No contract found");
            return;
        }
        console.log("Contract ID:", contract.id);
        setIsProcessing(true);
        try {
            console.log("Getting auth token...");
            const token = await auth.currentUser?.getIdToken();
            if (!token) {
                console.error("No auth token available");
                alert("認証エラー: ログインし直してください。");
                setIsProcessing(false);
                return;
            }
            console.log("Calling create-payment-intent API...");
            // Use Cloud Run direct URL to bypass domain mapping timeout
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
            const res = await fetch(`${apiUrl}/api/stripe/create-payment-intent`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ contractId: contract.id }),
            });
            console.log("API response status:", res.status);
            const data = await res.json();
            console.log("API response data:", data);
            if (data.error) throw new Error(data.error);
            
            if (data.skipped) {
                console.log("Payment skipped (demo mode)");
                setContract({ ...contract, status: 'escrow' });
                alert("仮決済（デモ）が完了しました。");
                return;
            }

            console.log("Opening payment modal with clientSecret:", data.clientSecret ? "present" : "missing");
            setClientSecret(data.clientSecret);
            setIsPaymentModalOpen(true);
        } catch (error: any) {
            console.error("Error creating payment intent:", error);
            alert(error.message || "仮決済準備中にエラーが発生しました。");
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
            // Use Cloud Run direct URL to bypass domain mapping timeout
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
            const res = await fetch(`${apiUrl}/api/stripe/capture-payment-intent`, {
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
                // setIsReviewModalOpen(true); // 自動で開かない（ユーザーのタイミングで評価させる）
                return;
            }

            if (data.transferWarning) {
                console.warn("Transfer warning:", data.transferWarning);
                // Transfer失敗でもCaptureは成功しているので完了扱いにする
                // ただしユーザーには通知しないか、控えめに通知する
            }

            setContract({ ...contract, status: 'completed' });
            alert("検収が完了し、支払いが確定しました。");
            // setIsReviewModalOpen(true); // 自動で開かない
        } catch (error: any) {
            console.error("Error capturing payment:", error);
            alert(error.message || "支払い確定処理中にエラーが発生しました。");
            // エラー発生時（特にtransfer_failedの場合）は画面をリロードして最新ステータスを反映させる
            // これにより、ボタンが消えたままになるのを防ぐ（transfer_failed状態でのUI表示が必要）
            window.location.reload();
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReviewSubmit = async (rating: number, comment: string) => {
        if (!contract || !user) return;
        
        try {
            await submitReview(
                contract.id,
                user.uid,
                contract.workerId,
                rating,
                comment,
                'client'
            );
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
            <div className="flex justify-between items-center mb-4">
                <Button variant="ghost" className="pl-0" onClick={() => router.back()}>
                    <ArrowLeft size={20} className="mr-2" />
                    戻る
                </Button>
                {/* 常にproposalIdをルームIDとして使用（契約前後でメッセージを統一） */}
                {contract.proposalId && (
                    <Link href={`/messages/${contract.proposalId}`}>
                        <Button variant="outline">
                            <MessageSquare size={16} className="mr-2" />
                            メッセージ
                        </Button>
                    </Link>
                )}
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <CardTitle className="text-2xl font-bold text-secondary">契約詳細</CardTitle>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                            contract.status === 'completed' ? 'bg-green-100 text-green-800' :
                            contract.status === 'submitted' ? 'bg-purple-100 text-purple-800' :
                            contract.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            contract.status === 'escrow' ? 'bg-cyan-100 text-cyan-800' :
                            contract.status === 'pending_signature' ? 'bg-orange-100 text-orange-800' :
                            contract.status === 'transfer_failed' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                        }`}>
                            {contract.status === 'completed' ? '完了' :
                             contract.status === 'submitted' ? '納品確認待ち' :
                             contract.status === 'in_progress' ? '業務進行中' :
                             contract.status === 'escrow' ? '仮決済済み' :
                             contract.status === 'waiting_for_escrow' ? '仮決済待ち' :
                             contract.status === 'pending_signature' ? '契約合意待ち' :
                             contract.status === 'transfer_failed' ? '送金エラー' : contract.status}
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
                            <h3 className="text-sm font-semibold text-gray-500 mb-1">
                                契約金額
                            </h3>
                            <div className="text-sm">
                                <div className="flex justify-between gap-4">
                                    <span>契約金額 (税抜):</span>
                                    <span>{contract.amount.toLocaleString()}円</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                    <span>消費税 (10%):</span>
                                    <span>{contract.tax.toLocaleString()}円</span>
                                </div>
                                <div className="flex justify-between gap-4 font-bold border-t pt-1 mt-1">
                                    <span>支払総額 (税込):</span>
                                    <span>{contract.totalAmount.toLocaleString()}円</span>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-gray-500 mb-1">契約日</h3>
                            <p className="text-gray-700">{contract.createdAt.toDate().toLocaleDateString()}</p>
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-gray-500 mb-1">ステータス</h3>
                            <div className="flex items-center gap-2">
                                {contract.status === 'pending_signature' && <FileText size={16} className="text-orange-600" />}
                                {contract.status === 'escrow' && <Clock size={16} className="text-yellow-600" />}
                                {contract.status === 'in_progress' && <FileText size={16} className="text-blue-600" />}
                                {contract.status === 'completed' && <CheckCircle size={16} className="text-green-600" />}
                                {contract.status === 'transfer_failed' && <AlertCircle size={16} className="text-red-600" />}
                                <span>
                                    {contract.status === 'pending_signature' ? '契約合意待ち' :
                                     contract.status === 'waiting_for_escrow' ? '仮決済待ち' :
                                     contract.status === 'escrow' ? '仮決済済み・業務開始待ち' :
                                     contract.status === 'in_progress' ? '業務進行中' :
                                     contract.status === 'submitted' ? '納品確認待ち' :
                                     contract.status === 'completed' ? '契約完了' :
                                     contract.status === 'transfer_failed' ? '送金エラー' : contract.status}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 契約合意待ち */}
                    {contract.status === 'pending_signature' && (
                        <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                            <h4 className="font-bold text-orange-900 mb-2">ワーカーの契約合意を待っています</h4>
                            <p className="text-sm text-orange-800">
                                契約オファーを送信しました。ワーカーが契約内容を確認し、合意するのをお待ちください。
                                ワーカーが合意すると、仮決済の手続きに進むことができます。
                            </p>
                        </div>
                    )}

                    {/* 仮決済ボタン */}
                    {contract.status === 'waiting_for_escrow' && (
                        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                            <h4 className="font-bold text-yellow-900 mb-2">仮決済手続きが必要です</h4>
                            <p className="text-sm text-yellow-800 mb-4">
                                業務を開始するには、まず仮決済（決済予約）を行う必要があります。
                                仮決済が完了すると、ワーカーに業務開始の通知が送られます。
                            </p>
                            <Button onClick={handleEscrow} disabled={isProcessing} className="bg-accent hover:bg-accent/90 text-white">
                                <CreditCard size={16} className="mr-2" />
                                仮決済へ進む
                            </Button>
                        </div>
                    )}

                    {(contract.status === 'submitted' || contract.status === 'completed' || contract.status === 'transfer_failed') && (
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                            <h4 className="font-bold text-blue-900 mb-2">納品物</h4>
                            <div className="space-y-2 text-sm text-blue-800 mb-4 bg-white p-3 rounded border border-blue-200 overflow-hidden">
                                <div className="overflow-hidden">
                                    <strong>成果物:</strong>
                                    {contract.deliveryFiles && contract.deliveryFiles.length > 0 ? (
                                        <div className="mt-1 space-y-1">
                                            {contract.deliveryFiles.map((file, index) => (
                                                <a 
                                                    key={index}
                                                    href={file.url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="flex items-center gap-2 underline text-primary overflow-hidden text-ellipsis hover:text-blue-600"
                                                    style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}
                                                >
                                                    <FileText size={14} />
                                                    {file.name}
                                                </a>
                                            ))}
                                        </div>
                                    ) : contract.deliveryFileUrl ? (
                                        // Backward compatibility
                                        <a 
                                            href={contract.deliveryFileUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="underline text-primary block mt-1 overflow-hidden text-ellipsis"
                                            style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}
                                        >
                                            {contract.deliveryFileUrl}
                                        </a>
                                    ) : (
                                        <span className="block mt-1 text-gray-500">なし</span>
                                    )}
                                </div>
                                <div className="mt-2">
                                    <strong>メッセージ:</strong>
                                    <p className="whitespace-pre-wrap mt-1">{contract.deliveryMessage}</p>
                                </div>
                            </div>
                            
                            {contract.status === 'submitted' && (
                                <div>
                                    <p className="text-sm text-blue-800 mb-4">
                                        内容を確認し、問題なければ検収を完了してください。
                                    </p>
                                    <div className="flex gap-4">
                                        <Button onClick={handleCapture} disabled={isProcessing}>
                                            検収完了（支払いを確定）
                                        </Button>
                                        {/* Future: Add Reject Button */}
                                    </div>
                                </div>
                            )}

                            {contract.status === 'transfer_failed' && (
                                <div className="bg-red-50 border border-red-200 p-4 rounded-lg mt-4">
                                    <h4 className="font-bold text-red-900 mb-2 flex items-center gap-2">
                                        <AlertCircle size={18} />
                                        送金エラーが発生しました
                                    </h4>
                                    <p className="text-sm text-red-800 mb-4">
                                        支払いは確定しましたが、ワーカーへの送金処理に失敗しました。
                                        しばらく待ってから再試行するか、運営にお問い合わせください。
                                    </p>
                                    <Button onClick={handleCapture} disabled={isProcessing} variant="danger">
                                        送金を再試行する
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* データ削除予定の警告 */}
                    {contract.status === 'completed' && contract.completedAt && (
                        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                            <h4 className="font-bold text-yellow-900 mb-2 flex items-center gap-2">
                                <AlertCircle size={18} />
                                データ保管期限のお知らせ
                            </h4>
                            <p className="text-sm text-yellow-800 mb-2">
                                この契約データ（納品物、メッセージ等）は、完了日から<strong>3か月後</strong>に自動削除されます。
                            </p>
                            <p className="text-sm text-yellow-800 mb-2">
                                <strong>削除予定日: {new Date(contract.completedAt.toDate().getTime() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString('ja-JP')}</strong>
                            </p>
                            <p className="text-sm text-yellow-700">
                                必要なデータは削除前にダウンロードして保存してください。削除後の復元はできません。
                            </p>
                        </div>
                    )}

                    {/* 評価セクション */}
                    {contract.status === 'completed' && (
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <h4 className="font-bold text-gray-900 mb-2">評価</h4>
                            {contract.clientReviewed ? (
                                <div className="text-green-600 font-medium flex items-center gap-2">
                                    <CheckCircle size={16} />
                                    評価済みです
                                </div>
                            ) : (
                                <div>
                                    <p className="text-sm text-gray-600 mb-4">
                                        取引が完了しました。ワーカーの評価を行ってください。
                                    </p>
                                    <Button onClick={() => setIsReviewModalOpen(true)} variant="outline">
                                        ワーカーを評価する
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* キャンセル済み表示 */}
                    {contract.status === 'cancelled' && (
                        <div className="bg-gray-100 p-4 rounded-lg border border-gray-300">
                            <h4 className="font-bold text-gray-700 mb-2 flex items-center gap-2">
                                <XCircle size={18} />
                                この契約はキャンセルされました
                            </h4>
                            {contract.cancelReason && (
                                <p className="text-sm text-gray-600">理由: {contract.cancelReason}</p>
                            )}
                            {contract.cancelledAt && (
                                <p className="text-sm text-gray-500 mt-1">
                                    キャンセル日時: {contract.cancelledAt.toDate().toLocaleString('ja-JP')}
                                </p>
                            )}
                        </div>
                    )}

                    {/* 係争中表示 */}
                    {contract.status === 'disputed' && (
                        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                            <h4 className="font-bold text-red-900 mb-2 flex items-center gap-2">
                                <AlertTriangle size={18} />
                                この契約は係争中です
                            </h4>
                            <p className="text-sm text-red-800">
                                運営が確認中です。解決までしばらくお待ちください。
                            </p>
                            {contract.noContactReportReason && (
                                <p className="text-sm text-red-700 mt-2">
                                    報告内容: {contract.noContactReportReason}
                                </p>
                            )}
                        </div>
                    )}

                    {/* キャンセル申請中の表示（相手からの申請） */}
                    {contract.cancelRequestedBy && contract.cancelRequestedBy !== user?.uid && contract.status !== 'cancelled' && (
                        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                            <h4 className="font-bold text-orange-900 mb-2 flex items-center gap-2">
                                <AlertTriangle size={18} />
                                ワーカーからキャンセル申請があります
                            </h4>
                            <p className="text-sm text-orange-800 mb-2">
                                理由: {contract.cancelReason || '理由なし'}
                            </p>
                            <p className="text-sm text-orange-700 mb-4">
                                承認すると契約がキャンセルされ、仮決済済みの場合は全額返金されます。
                            </p>
                            <Button
                                onClick={async () => {
                                    if (!confirm("キャンセルを承認しますか？仮決済済みの場合は全額返金されます。")) return;
                                    setIsProcessing(true);
                                    try {
                                        const token = await auth.currentUser?.getIdToken();
                                        const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
                                        const res = await fetch(`${apiUrl}/api/contracts/cancel-approve`, {
                                            method: "POST",
                                            headers: {
                                                "Content-Type": "application/json",
                                                Authorization: `Bearer ${token}`,
                                            },
                                            body: JSON.stringify({ contractId: contract.id }),
                                        });
                                        const data = await res.json();
                                        if (data.error) throw new Error(data.error);
                                        alert("キャンセルを承認しました。");
                                    } catch (error: any) {
                                        alert(error.message || "エラーが発生しました");
                                    } finally {
                                        setIsProcessing(false);
                                    }
                                }}
                                disabled={isProcessing}
                                variant="danger"
                            >
                                <XCircle size={16} className="mr-2" />
                                キャンセルを承認する
                            </Button>
                        </div>
                    )}

                    {/* 自分のキャンセル申請中の表示 */}
                    {contract.cancelRequestedBy && contract.cancelRequestedBy === user?.uid && contract.status !== 'cancelled' && (
                        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                            <h4 className="font-bold text-yellow-900 mb-2 flex items-center gap-2">
                                <Clock size={18} />
                                キャンセル申請中
                            </h4>
                            <p className="text-sm text-yellow-800">
                                ワーカーの承認を待っています。承認されると契約がキャンセルされます。
                            </p>
                        </div>
                    )}

                    {/* キャンセル申請ボタン（キャンセル可能なステータスの場合） */}
                    {['pending_signature', 'waiting_for_escrow', 'escrow', 'in_progress'].includes(contract.status) && 
                     !contract.cancelRequestedBy && (
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <h4 className="font-bold text-gray-700 mb-2">契約のキャンセル</h4>
                            <p className="text-sm text-gray-600 mb-4">
                                契約をキャンセルする場合は、下記ボタンからキャンセル申請を行ってください。
                                ワーカーが承認すると契約がキャンセルされます。
                                {(contract.status === 'escrow' || contract.status === 'in_progress') && (
                                    <span className="block mt-1 text-orange-600">
                                        ※仮決済済みのため、キャンセル時は全額返金されます。
                                    </span>
                                )}
                            </p>
                            <Button
                                onClick={async () => {
                                    const reason = prompt("キャンセル理由を入力してください（任意）:");
                                    if (reason === null) return; // キャンセル
                                    if (!confirm("キャンセル申請を送信しますか？")) return;
                                    setIsProcessing(true);
                                    try {
                                        const token = await auth.currentUser?.getIdToken();
                                        const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
                                        const res = await fetch(`${apiUrl}/api/contracts/cancel-request`, {
                                            method: "POST",
                                            headers: {
                                                "Content-Type": "application/json",
                                                Authorization: `Bearer ${token}`,
                                            },
                                            body: JSON.stringify({ contractId: contract.id, reason }),
                                        });
                                        const data = await res.json();
                                        if (data.error) throw new Error(data.error);
                                        alert("キャンセル申請を送信しました。ワーカーの承認をお待ちください。");
                                    } catch (error: any) {
                                        alert(error.message || "エラーが発生しました");
                                    } finally {
                                        setIsProcessing(false);
                                    }
                                }}
                                disabled={isProcessing}
                                variant="outline"
                                className="text-red-600 border-red-300 hover:bg-red-50"
                            >
                                <XCircle size={16} className="mr-2" />
                                キャンセル申請
                            </Button>
                        </div>
                    )}

                    {/* 連絡不通報告ボタン（escrow/in_progress時のみ） */}
                    {['escrow', 'in_progress'].includes(contract.status) && !contract.noContactReportedAt && (
                        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                            <h4 className="font-bold text-red-900 mb-2 flex items-center gap-2">
                                <AlertTriangle size={18} />
                                ワーカーと連絡が取れない場合
                            </h4>
                            <p className="text-sm text-red-800 mb-4">
                                7日以上ワーカーから連絡がない場合は、運営に報告できます。
                                運営が確認後、強制キャンセル・返金の対応を行います。
                            </p>
                            <Button
                                onClick={async () => {
                                    const reason = prompt("状況を詳しく教えてください（最後に連絡があった日時、送ったメッセージの内容など）:");
                                    if (!reason) {
                                        alert("報告内容を入力してください。");
                                        return;
                                    }
                                    if (!confirm("連絡不通を運営に報告しますか？")) return;
                                    setIsProcessing(true);
                                    try {
                                        const token = await auth.currentUser?.getIdToken();
                                        const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
                                        const res = await fetch(`${apiUrl}/api/contracts/report-no-contact`, {
                                            method: "POST",
                                            headers: {
                                                "Content-Type": "application/json",
                                                Authorization: `Bearer ${token}`,
                                            },
                                            body: JSON.stringify({ contractId: contract.id, reason }),
                                        });
                                        const data = await res.json();
                                        if (data.error) throw new Error(data.error);
                                        alert("報告を送信しました。運営が確認後、対応いたします。");
                                    } catch (error: any) {
                                        alert(error.message || "エラーが発生しました");
                                    } finally {
                                        setIsProcessing(false);
                                    }
                                }}
                                disabled={isProcessing}
                                variant="danger"
                            >
                                <AlertTriangle size={16} className="mr-2" />
                                連絡不通を報告する
                            </Button>
                        </div>
                    )}

                    {/* 連絡不通報告済み表示 */}
                    {contract.noContactReportedAt && contract.status !== 'cancelled' && contract.status !== 'disputed' && (
                        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                            <h4 className="font-bold text-yellow-900 mb-2 flex items-center gap-2">
                                <Clock size={18} />
                                連絡不通報告済み
                            </h4>
                            <p className="text-sm text-yellow-800">
                                運営が確認中です。対応までしばらくお待ちください。
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {clientSecret && (
                <PaymentModal
                    isOpen={isPaymentModalOpen}
                    onClose={() => setIsPaymentModalOpen(false)}
                    clientSecret={clientSecret}
                    onSuccess={async () => {
                        setIsPaymentModalOpen(false);
                        try {
                            // Stripe決済成功後、verify-payment APIを呼び出してDBを確実に更新
                            const token = await auth.currentUser?.getIdToken();
                            // Use Cloud Run direct URL to bypass domain mapping timeout
                            const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
                            const res = await fetch(`${apiUrl}/api/stripe/verify-payment`, {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                    Authorization: `Bearer ${token}`,
                                },
                                body: JSON.stringify({ contractId: contract.id }),
                            });
                            const data = await res.json();
                            if (data.error) {
                                console.error("Verify payment error:", data.error);
                            }
                        } catch (error) {
                            console.error("Error verifying payment:", error);
                        }
                        // onSnapshotでリアルタイム更新されるため、ローカル状態の更新は不要
                        alert("仮決済が完了しました。");
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
