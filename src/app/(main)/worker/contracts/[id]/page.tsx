"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { updateContractStatus, submitContractDelivery, updateUserRating } from "@/lib/db";
import { Contract } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ArrowLeft, CheckCircle, Clock, FileText, Upload, X, MessageSquare } from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { ReviewModal } from "@/components/features/contract/ReviewModal";
import Link from "next/link";

export default function WorkerContractDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const [contract, setContract] = useState<Contract | null>(null);
    const [loading, setLoading] = useState(true);
    const [deliveryFileUrl, setDeliveryFileUrl] = useState("");
    const [deliveryMessage, setDeliveryMessage] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);

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
        if (!contract) return;
        try {
            // Mock calculation: just set the new rating (in reality, calculate average)
            await updateUserRating(contract.clientId, rating, 1); // 1 is dummy count increment
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
                {/* コンペ方式の場合は契約IDをルームIDとして使用、それ以外はproposalIdを使用 */}
                <Link href={`/messages/${contract.proposalId || contract.id}`}>
                    <Button variant="outline">
                        <MessageSquare size={16} className="mr-2" />
                        メッセージ
                    </Button>
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <CardTitle className="text-2xl font-bold text-secondary">契約詳細</CardTitle>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${contract.status === 'completed' ? 'bg-green-100 text-green-800' :
                                contract.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                    'bg-yellow-100 text-yellow-800'
                            }`}>
                            {contract.status === 'completed' ? '完了' :
                                contract.status === 'in_progress' ? '進行中' :
                                    contract.status === 'escrow' ? '仮決済済み' : contract.status}
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
                                受取金額
                            </h3>
                            <div className="text-sm">
                                <div className="flex justify-between gap-4">
                                    <span>契約金額 (税抜):</span>
                                    <span>{contract.amount.toLocaleString()}円</span>
                                </div>
                                <div className="flex justify-between gap-4 text-gray-500">
                                    <span>システム手数料 (5%):</span>
                                    <span>-{contract.platformFee.toLocaleString()}円</span>
                                </div>
                                <div className="flex justify-between gap-4 font-bold border-t pt-1 mt-1">
                                    <span>受取予定額:</span>
                                    <span>{contract.workerReceiveAmount.toLocaleString()}円</span>
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
                                {contract.status === 'escrow' && <Clock size={16} className="text-yellow-600" />}
                                {contract.status === 'in_progress' && <FileText size={16} className="text-blue-600" />}
                                {contract.status === 'completed' && <CheckCircle size={16} className="text-green-600" />}
                                <span>
                                    {contract.status === 'waiting_for_escrow' ? 'クライアントの仮決済待ちです' :
                                     contract.status === 'escrow' ? '業務を開始してください' :
                                     contract.status === 'in_progress' ? '業務進行中' :
                                     contract.status === 'submitted' ? '検収待ち' :
                                     contract.status === 'completed' ? '契約完了' : ''}
                                </span>
                            </div>
                        </div>
                    </div>

                    {contract.status === 'escrow' && (
                        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                            <h4 className="font-bold text-yellow-900 mb-2">業務開始</h4>
                            <p className="text-sm text-yellow-800 mb-4">
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
                                                setFile(e.dataTransfer.files[0]);
                                            }
                                        }}
                                    >
                                        <input
                                            type="file"
                                            className="hidden"
                                            id="delivery-file"
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files.length > 0) {
                                                    setFile(e.target.files[0]);
                                                }
                                            }}
                                        />
                                        {!file ? (
                                            <label
                                                htmlFor="delivery-file"
                                                className="cursor-pointer flex flex-col items-center justify-center gap-2"
                                            >
                                                <Upload className="h-8 w-8 text-gray-400" />
                                                <span className="text-sm text-gray-600">
                                                    クリックしてファイルを選択するか、ここにドラッグ＆ドロップしてください
                                                </span>
                                            </label>
                                        ) : (
                                            <div className="flex items-center justify-between w-full p-2 bg-gray-50 rounded-lg">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="h-4 w-4 text-gray-500" />
                                                    <span className="text-sm text-gray-700 truncate">{file.name}</span>
                                                    <span className="text-xs text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setFile(null)}
                                                    className="text-gray-400 hover:text-danger"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
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
                                    disabled={submitting || !file || !deliveryMessage}
                                    onClick={async () => {
                                        if (!confirm("納品報告を行いますか？")) return;
                                        setSubmitting(true);
                                        try {
                                            let url = "";
                                            if (file) {
                                                const storageRef = ref(storage, `deliveries/${contract.id}/${Date.now()}_${file.name}`);
                                                await uploadBytes(storageRef, file);
                                                url = await getDownloadURL(storageRef);
                                            }

                                            await submitContractDelivery(contract.id, url, deliveryMessage);
                                            setContract({
                                                ...contract,
                                                status: 'submitted',
                                                deliveryFileUrl: url,
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
                                <div>
                                    <strong>成果物URL:</strong>
                                    <a 
                                        href={contract.deliveryFileUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="underline block break-all mt-1"
                                    >
                                        {contract.deliveryFileUrl}
                                    </a>
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
                                    <Button onClick={() => setIsReviewModalOpen(true)} variant="outline">
                                        クライアントを評価する
                                    </Button>
                                </div>
                            )}
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
