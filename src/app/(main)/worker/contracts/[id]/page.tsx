"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { updateContractStatus, submitContractDelivery, submitReview } from "@/lib/db";
import { Contract } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ArrowLeft, CheckCircle, Clock, FileText, Upload, X, MessageSquare, AlertCircle, XCircle, AlertTriangle } from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";
import { db, storage, auth } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { ReviewModal } from "@/components/features/contract/ReviewModal";
import Link from "next/link";

export default function WorkerContractDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const [contract, setContract] = useState<Contract | null>(null);
    const [loading, setLoading] = useState(true);
    const [deliveryMessage, setDeliveryMessage] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

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

    const handleReviewSubmit = async (rating: number, comment: string) => {
        if (!contract || !user) return;
        try {
            await submitReview(
                contract.id,
                user.uid,
                contract.clientId,
                rating,
                comment,
                'worker'
            );
            alert("評価を送信しました。");
        } catch (error) {
            console.error("Error submitting review:", error);
            alert("評価の送信に失敗しました。");
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            setFiles((prev) => [...prev, ...newFiles]);
        }
    };

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const uploadFiles = async (files: File[]): Promise<{ name: string; url: string }[]> => {
        const attachments: { name: string; url: string }[] = [];
        for (const file of files) {
            const storageRef = ref(storage, `deliveries/${contract?.id}/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            attachments.push({ name: file.name, url });
        }
        return attachments;
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
                            contract.status === 'waiting_for_escrow' ? 'bg-yellow-100 text-yellow-800' :
                            contract.status === 'pending_signature' ? 'bg-orange-100 text-orange-800' :
                            contract.status === 'payment_expired' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                        }`}>
                            {contract.status === 'completed' ? '完了' :
                             contract.status === 'submitted' ? '検収待ち' :
                             contract.status === 'in_progress' ? '業務進行中' :
                             contract.status === 'escrow' ? '仮決済済み' :
                             contract.status === 'waiting_for_escrow' ? '仮決済待ち' :
                             contract.status === 'pending_signature' ? '契約合意待ち' :
                             contract.status === 'payment_expired' ? '仮決済期限切れ' : contract.status}
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
                                受取金額
                            </h3>
                            <div className="text-sm">
                                <div className="flex justify-between gap-4">
                                    <span>契約金額 (税込):</span>
                                    <span>{contract.totalAmount.toLocaleString()}円</span>
                                </div>
                                <div className="flex justify-between gap-4 text-gray-500">
                                    <span>システム手数料 5% (税込):</span>
                                    <span>-{contract.platformFee.toLocaleString()}円</span>
                                </div>
                                <div className="flex justify-between gap-4 font-bold border-t pt-1 mt-1 text-primary">
                                    <span>受取予定額 (税込):</span>
                                    <span>{contract.workerReceiveAmount.toLocaleString()}円</span>
                                </div>
                                {contract.status === 'completed' && (
                                    <div className="mt-2 pt-2 border-t border-dashed text-xs text-gray-500">
                                        <p>※ 入金予定日: 検収完了から通常2〜3営業日後</p>
                                    </div>
                                )}
                            </div>
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
                                    {contract.status === 'pending_signature' ? '契約合意待ち' :
                                     contract.status === 'waiting_for_escrow' ? 'クライアントの仮決済待ちです' :
                                     contract.status === 'escrow' ? '業務を開始してください' :
                                     contract.status === 'in_progress' ? '業務進行中' :
                                     contract.status === 'submitted' ? '検収待ち' :
                                     contract.status === 'completed' ? '契約完了' : ''}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 契約合意待ち - ワーカーが合意するボタン */}
                    {contract.status === 'pending_signature' && (
                        <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                            <h4 className="font-bold text-orange-900 mb-2">契約内容を確認してください</h4>
                            <p className="text-sm text-orange-800 mb-4">
                                クライアントから契約オファーが届いています。
                                上記の契約内容（金額、案件名など）を確認し、問題なければ「契約に合意する」ボタンを押してください。
                                合意後、クライアントが仮決済を行うと業務を開始できます。
                            </p>
                            <Button
                                onClick={async () => {
                                    if (!confirm("この契約内容で合意しますか？")) return;
                                    await updateContractStatus(contract.id, 'waiting_for_escrow');
                                    setContract({ ...contract, status: 'waiting_for_escrow' });
                                    alert("契約に合意しました。クライアントの仮決済をお待ちください。");
                                }}
                                className="bg-accent hover:bg-accent/90 text-white"
                            >
                                契約に合意する
                            </Button>
                        </div>
                    )}

                    {/* 仮決済待ち */}
                    {contract.status === 'waiting_for_escrow' && (
                        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                            <h4 className="font-bold text-yellow-900 mb-2">クライアントの仮決済待ち</h4>
                            <p className="text-sm text-yellow-800">
                                契約に合意しました。クライアントが仮決済を完了するまでお待ちください。
                                仮決済が完了すると、業務を開始できます。
                            </p>
                        </div>
                    )}

                    {contract.status === 'escrow' && (
                        <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-100">
                            <h4 className="font-bold text-cyan-900 mb-2">業務開始</h4>
                            <p className="text-sm text-cyan-800 mb-4">
                                クライアントの仮決済が完了しました。業務を開始してください。
                            </p>
                            <Button
                                onClick={async () => {
                                    if (!confirm("業務を開始しますか？")) return;
                                    await updateContractStatus(contract.id, 'in_progress');
                                    setContract({ ...contract, status: 'in_progress' });
                                }}
                            >
                                業務を開始する
                            </Button>
                        </div>
                    )}

                    {contract.status === 'in_progress' && (
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                            <h4 className="font-bold text-blue-900 mb-2">納品報告</h4>
                            <p className="text-sm text-blue-800 mb-4">
                                業務が完了したら、成果物をアップロードし、メッセージを入力して納品報告を行ってください。
                            </p>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">成果物ファイル</label>
                                    <div
                                        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors bg-white ${
                                            isDragging ? "border-primary bg-primary/5" : "border-gray-300 hover:border-primary"
                                        }`}
                                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            setIsDragging(false);
                                            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                                                const newFiles = Array.from(e.dataTransfer.files);
                                                setFiles((prev) => [...prev, ...newFiles]);
                                            }
                                        }}
                                    >
                                        <input
                                            type="file"
                                            multiple
                                            className="hidden"
                                            id="delivery-file"
                                            onChange={handleFileSelect}
                                        />
                                        <label
                                            htmlFor="delivery-file"
                                            className="cursor-pointer flex flex-col items-center justify-center gap-2 w-full h-full"
                                        >
                                            <Upload className="h-8 w-8 text-gray-400" />
                                            <span className="text-sm text-gray-600">
                                                クリックしてファイルを選択するか、ここにドラッグ＆ドロップしてください (複数可)
                                            </span>
                                        </label>
                                    </div>
                                    {files.length > 0 && (
                                        <div className="mt-2 space-y-2">
                                            {files.map((file, index) => (
                                                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="h-4 w-4 text-gray-500" />
                                                        <span className="text-sm text-gray-700 truncate max-w-[200px]">{file.name}</span>
                                                        <span className="text-xs text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeFile(index)}
                                                        className="text-gray-400 hover:text-danger"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">メッセージ</label>
                                    <textarea
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 h-32 focus:border-primary focus:ring-1 focus:ring-primary"
                                        placeholder="納品いたします。ご確認をお願いいたします。"
                                        value={deliveryMessage}
                                        onChange={(e) => setDeliveryMessage(e.target.value)}
                                    />
                                </div>
                                <Button
                                    disabled={submitting || (files.length === 0 && !deliveryMessage)}
                                    onClick={async () => {
                                        if (!confirm("納品報告を行いますか？")) return;
                                        setSubmitting(true);
                                        try {
                                            const attachments = await uploadFiles(files);

                                            await submitContractDelivery(contract.id, attachments, deliveryMessage);
                                            setContract({
                                                ...contract,
                                                status: 'submitted',
                                                deliveryFiles: attachments,
                                                deliveryMessage
                                            });
                                        } catch (error) {
                                            console.error(error);
                                            alert("エラーが発生しました");
                                        } finally {
                                            setSubmitting(false);
                                        }
                                    }}
                                >
                                    <Upload size={16} className="mr-2" /> 納品報告する
                                </Button>
                            </div>
                        </div>
                    )}

                    {(contract.status === 'submitted' || contract.status === 'completed') && (
                        <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                            <h4 className="font-bold text-green-900 mb-2">納品済み</h4>
                            <div className="space-y-2 text-sm text-green-800 overflow-hidden">
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
                                                    className="flex items-center gap-2 underline overflow-hidden text-ellipsis hover:text-green-600"
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
                                            className="underline block mt-1 overflow-hidden text-ellipsis"
                                            style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}
                                        >
                                            {contract.deliveryFileUrl}
                                        </a>
                                    ) : (
                                        <span className="block mt-1 text-gray-500">なし</span>
                                    )}
                                </div>
                                <div>
                                    <strong>メッセージ:</strong>
                                    <p className="whitespace-pre-wrap bg-white p-2 rounded border border-green-200 mt-1">{contract.deliveryMessage}</p>
                                </div>
                            </div>
                            {contract.status === 'submitted' && (
                                <p className="mt-4 text-sm font-bold text-green-800">
                                    クライアントの検収待ちです。
                                </p>
                            )}
                            {contract.status === 'completed' && (
                                <div className="mt-4">
                                    {/* データ削除予定の警告 */}
                                    {contract.completedAt && (
                                        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mb-4">
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
                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4">
                                        <h4 className="font-bold text-gray-900 mb-2">評価</h4>
                                        {contract.workerReviewed ? (
                                            <div className="text-green-600 font-medium flex items-center gap-2">
                                                <CheckCircle size={16} />
                                                評価済みです
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="text-sm text-gray-600 mb-4">
                                                    取引が完了しました。クライアントの評価を行ってください。
                                                </p>
                                                <Button onClick={() => setIsReviewModalOpen(true)} variant="outline">
                                                    クライアントを評価する
                                                </Button>
                                            </div>
                                        )}
                                    </div>
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

                    {/* 仮決済期限切れ表示 */}
                    {contract.status === 'payment_expired' && (
                        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                            <h4 className="font-bold text-red-900 mb-2 flex items-center gap-2">
                                <AlertCircle size={18} />
                                仮決済の期限が切れました
                            </h4>
                            <p className="text-sm text-red-800">
                                クライアントの仮決済が7日間の有効期限を過ぎたため、自動的にキャンセルされました。
                                クライアントが再度仮払いを行うと、契約を再開できます。
                            </p>
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
                        </div>
                    )}

                    {/* キャンセル申請中の表示（相手からの申請） */}
                    {contract.cancelRequestedBy && contract.cancelRequestedBy !== user?.uid && contract.status !== 'cancelled' && (
                        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                            <h4 className="font-bold text-orange-900 mb-2 flex items-center gap-2">
                                <AlertTriangle size={18} />
                                クライアントからキャンセル申請があります
                            </h4>
                            <p className="text-sm text-orange-800 mb-2">
                                理由: {contract.cancelReason || '理由なし'}
                            </p>
                            <p className="text-sm text-orange-700 mb-4">
                                承認すると契約がキャンセルされます。
                            </p>
                            <Button
                                onClick={async () => {
                                    if (!confirm("キャンセルを承認しますか？")) return;
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
                                クライアントの承認を待っています。承認されると契約がキャンセルされます。
                            </p>
                        </div>
                    )}

                    {/* キャンセル申請ボタン（キャンセル可能なステータスの場合） */}
                    {['pending_signature', 'waiting_for_escrow', 'escrow', 'in_progress', 'submitted'].includes(contract.status) && 
                     !contract.cancelRequestedBy && (
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <h4 className="font-bold text-gray-700 mb-2">契約のキャンセル</h4>
                            <p className="text-sm text-gray-600 mb-4">
                                業務を続けられない場合は、キャンセル申請を行ってください。
                                クライアントが承認すると契約がキャンセルされます。
                            </p>
                            <Button
                                onClick={async () => {
                                    const reason = prompt("キャンセル理由を入力してください（任意）:");
                                    if (reason === null) return;
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
                                        alert("キャンセル申請を送信しました。クライアントの承認をお待ちください。");
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
                </CardContent>
            </Card>

            <ReviewModal
                isOpen={isReviewModalOpen}
                onClose={() => setIsReviewModalOpen(false)}
                onSubmit={handleReviewSubmit}
            />
        </div>
    );
}
