"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Contract } from "@/types";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ArrowLeft, AlertTriangle, RefreshCw, Ban, MessageSquare, FileText } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";

const ADMIN_EMAIL = "yamazarukyoto@gmail.com";

export default function AdminContractDetailPage() {
    const { user: authUser, loading: authLoading } = useAuth();
    const params = useParams();
    const router = useRouter();
    const [contract, setContract] = useState<Contract | null>(null);
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [cancelReason, setCancelReason] = useState("");
    const [clientName, setClientName] = useState("");
    const [workerName, setWorkerName] = useState("");

    useEffect(() => {
        if (!authLoading && (!authUser || authUser.email !== ADMIN_EMAIL)) {
            router.replace(authUser ? "/" : "/login?redirect=/admin/contracts");
        }
    }, [authUser, authLoading, router]);

    useEffect(() => {
        if (!params.id || authLoading || !authUser || authUser.email !== ADMIN_EMAIL) return;

        const unsubscribe = onSnapshot(doc(db, "contracts", params.id as string), async (docSnap) => {
            if (docSnap.exists()) {
                const contractData = { id: docSnap.id, ...docSnap.data() } as Contract;
                setContract(contractData);

                // クライアント名とワーカー名を取得
                try {
                    const clientDoc = await getDoc(doc(db, "users", contractData.clientId));
                    if (clientDoc.exists()) {
                        setClientName(clientDoc.data().displayName || clientDoc.data().email || contractData.clientId);
                    }
                    const workerDoc = await getDoc(doc(db, "users", contractData.workerId));
                    if (workerDoc.exists()) {
                        setWorkerName(workerDoc.data().displayName || workerDoc.data().email || contractData.workerId);
                    }
                } catch (error) {
                    console.error("Error fetching user names:", error);
                }
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [params.id, authLoading, authUser]);

    if (authLoading || !authUser || authUser.email !== ADMIN_EMAIL) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    const handleForceCancel = async (withRefund: boolean) => {
        if (!contract) return;
        
        const confirmMessage = withRefund 
            ? "この契約を強制キャンセルし、クライアントに全額返金しますか？\n\nこの操作は取り消せません。"
            : "この契約を強制キャンセルしますか？（返金なし）\n\nこの操作は取り消せません。";
        
        if (!confirm(confirmMessage)) return;

        setIsProcessing(true);
        try {
            const token = await auth.currentUser?.getIdToken();
            if (!token) {
                alert("認証エラー: ログインし直してください。");
                return;
            }

            const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
            const res = await fetch(`${apiUrl}/api/admin/force-cancel`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    contractId: contract.id,
                    reason: cancelReason || "運営による強制キャンセル",
                    refund: withRefund,
                }),
            });

            const data = await res.json();
            if (data.error) {
                throw new Error(data.error);
            }

            alert(data.message);
        } catch (error: unknown) {
            console.error("Error force cancelling:", error);
            alert(error instanceof Error ? error.message : "エラーが発生しました。");
        } finally {
            setIsProcessing(false);
        }
    };

    if (loading) return <div className="p-8 text-center">読み込み中...</div>;
    if (!contract) return <div className="p-8 text-center">契約が見つかりません</div>;

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
            pending_signature: { bg: "bg-orange-100", text: "text-orange-800", label: "契約合意待ち" },
            waiting_for_escrow: { bg: "bg-yellow-100", text: "text-yellow-800", label: "仮決済待ち" },
            escrow: { bg: "bg-cyan-100", text: "text-cyan-800", label: "仮決済済み" },
            in_progress: { bg: "bg-blue-100", text: "text-blue-800", label: "業務進行中" },
            submitted: { bg: "bg-purple-100", text: "text-purple-800", label: "納品確認待ち" },
            disputed: { bg: "bg-red-100", text: "text-red-800", label: "トラブル中" },
            completed: { bg: "bg-green-100", text: "text-green-800", label: "完了" },
            cancelled: { bg: "bg-gray-100", text: "text-gray-800", label: "キャンセル" },
            transfer_failed: { bg: "bg-red-100", text: "text-red-800", label: "送金エラー" },
        };
        const config = statusConfig[status] || { bg: "bg-gray-100", text: "text-gray-800", label: status };
        return (
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
                {config.label}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => router.back()}>
                    <ArrowLeft size={20} className="mr-2" />
                    戻る
                </Button>
                <h1 className="text-2xl font-bold">契約詳細（管理者）</h1>
            </div>

            {/* 基本情報 */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>基本情報</CardTitle>
                        {getStatusBadge(contract.status)}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-500">契約ID</p>
                            <p className="font-mono text-sm">{contract.id}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">案件名</p>
                            <p className="font-medium">{contract.jobTitle}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">クライアント</p>
                            <p>{clientName}</p>
                            <p className="text-xs text-gray-400 font-mono">{contract.clientId}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">ワーカー</p>
                            <p>{workerName}</p>
                            <p className="text-xs text-gray-400 font-mono">{contract.workerId}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">契約金額（税込）</p>
                            <p className="font-bold text-lg">¥{contract.totalAmount.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">契約日</p>
                            <p>{contract.createdAt.toDate().toLocaleString('ja-JP')}</p>
                        </div>
                    </div>

                    {/* Stripe情報 */}
                    {contract.stripePaymentIntentId && (
                        <div className="border-t pt-4 mt-4">
                            <p className="text-sm text-gray-500 mb-2">Stripe情報</p>
                            <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                                <p>PaymentIntent: {contract.stripePaymentIntentId}</p>
                                {contract.stripeTransferId && <p>Transfer: {contract.stripeTransferId}</p>}
                            </div>
                        </div>
                    )}

                    {/* メッセージリンク */}
                    {contract.proposalId && (
                        <div className="border-t pt-4 mt-4">
                            <Link href={`/messages/${contract.proposalId}`} target="_blank">
                                <Button variant="outline">
                                    <MessageSquare size={16} className="mr-2" />
                                    メッセージを確認
                                </Button>
                            </Link>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* キャンセル申請情報 */}
            {contract.cancelRequestedBy && (
                <Card className="border-orange-200 bg-orange-50">
                    <CardHeader>
                        <CardTitle className="text-orange-800 flex items-center gap-2">
                            <AlertTriangle size={20} />
                            キャンセル申請中
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm">
                            申請者: {contract.cancelRequestedBy === contract.clientId ? "クライアント" : "ワーカー"}
                        </p>
                        {contract.cancelReason && (
                            <p className="text-sm mt-2">理由: {contract.cancelReason}</p>
                        )}
                        {contract.cancelRequestedAt && (
                            <p className="text-sm text-gray-500 mt-2">
                                申請日時: {contract.cancelRequestedAt.toDate().toLocaleString('ja-JP')}
                            </p>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* 連絡不通報告 */}
            {contract.noContactReportedAt && (
                <Card className="border-red-200 bg-red-50">
                    <CardHeader>
                        <CardTitle className="text-red-800 flex items-center gap-2">
                            <AlertTriangle size={20} />
                            連絡不通報告あり
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm">
                            報告日時: {contract.noContactReportedAt.toDate().toLocaleString('ja-JP')}
                        </p>
                        {contract.noContactReportReason && (
                            <p className="text-sm mt-2">理由: {contract.noContactReportReason}</p>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* 納品物 */}
            {(contract.deliveryFiles || contract.deliveryFileUrl) && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText size={20} />
                            納品物
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {contract.deliveryFiles && contract.deliveryFiles.length > 0 ? (
                            <div className="space-y-2">
                                {contract.deliveryFiles.map((file, index) => (
                                    <a
                                        key={index}
                                        href={file.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-primary hover:underline"
                                    >
                                        <FileText size={14} />
                                        {file.name}
                                    </a>
                                ))}
                            </div>
                        ) : contract.deliveryFileUrl ? (
                            <a
                                href={contract.deliveryFileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline break-all"
                            >
                                {contract.deliveryFileUrl}
                            </a>
                        ) : null}
                        {contract.deliveryMessage && (
                            <div className="mt-4 p-3 bg-gray-50 rounded">
                                <p className="text-sm text-gray-500 mb-1">メッセージ:</p>
                                <p className="whitespace-pre-wrap">{contract.deliveryMessage}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* 管理者アクション */}
            {contract.status !== 'cancelled' && contract.status !== 'completed' && (
                <Card className="border-red-200">
                    <CardHeader>
                        <CardTitle className="text-red-800">管理者アクション</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                キャンセル理由（任意）
                            </label>
                            <textarea
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 h-24"
                                placeholder="キャンセル理由を入力..."
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-4">
                            {(contract.status === 'escrow' || contract.status === 'in_progress' || contract.status === 'disputed') && (
                                <Button
                                    variant="danger"
                                    onClick={() => handleForceCancel(true)}
                                    disabled={isProcessing}
                                >
                                    <RefreshCw size={16} className="mr-2" />
                                    強制キャンセル＋全額返金
                                </Button>
                            )}
                            <Button
                                variant="outline"
                                onClick={() => handleForceCancel(false)}
                                disabled={isProcessing}
                                className="border-red-300 text-red-700 hover:bg-red-50"
                            >
                                <Ban size={16} className="mr-2" />
                                強制キャンセル（返金なし）
                            </Button>
                        </div>
                        <p className="text-xs text-gray-500">
                            ※ 仮決済済み（escrow/in_progress/disputed）の場合のみ返金が可能です。
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* キャンセル済み情報 */}
            {contract.status === 'cancelled' && (
                <Card className="border-gray-300 bg-gray-50">
                    <CardHeader>
                        <CardTitle className="text-gray-700">キャンセル情報</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {contract.cancelReason && (
                            <p className="text-sm mb-2">理由: {contract.cancelReason}</p>
                        )}
                        {contract.cancelledAt && (
                            <p className="text-sm text-gray-500">
                                キャンセル日時: {contract.cancelledAt.toDate().toLocaleString('ja-JP')}
                            </p>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
