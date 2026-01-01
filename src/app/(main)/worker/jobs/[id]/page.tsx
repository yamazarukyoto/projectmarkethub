"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/components/providers/AuthProvider";
import { getJob, createProposal, getWorkerProposals, getContracts } from "@/lib/db";
import { Job, Proposal } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ArrowLeft, Clock, DollarSign, Calendar, Tag, CheckCircle, Paperclip, Download, Upload, X, FileText, MessageSquare } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const proposalSchema = z.object({
    price: z.number().min(1, "金額を入力してください"),
    message: z.string().min(1, "メッセージを入力してください"),
    estimatedDuration: z.string().min(1, "完了予定を入力してください"),
});

type ProposalFormValues = z.infer<typeof proposalSchema>;

export default function WorkerJobDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const [job, setJob] = useState<Job | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [hasApplied, setHasApplied] = useState(false);
    const [contractId, setContractId] = useState<string | null>(null);
    const [proposalId, setProposalId] = useState<string | null>(null);
    const [files, setFiles] = useState<File[]>([]);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ProposalFormValues>({
        resolver: zodResolver(proposalSchema),
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                if (params.id && user) {
                    const jobId = params.id as string;
                    const jobData = await getJob(jobId);
                    setJob(jobData);

                    // Check if already applied
                    const myProposals = await getWorkerProposals(user.uid);
                    const myProposal = myProposals.find(p => p.jobId === jobId);
                    const applied = !!myProposal;
                    setHasApplied(applied);

                    if (applied && myProposal) {
                        setProposalId(myProposal.id);
                        const contracts = await getContracts(user.uid, 'worker');
                        const myContract = contracts.find(c => c.jobId === jobId);
                        if (myContract) {
                            setContractId(myContract.id);
                        }
                    }
                }
            } catch (error) {
                console.error("Error fetching job details:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [params.id, user]);

    const uploadFiles = async (files: File[]): Promise<{ name: string; url: string }[]> => {
        const attachments: { name: string; url: string }[] = [];
        for (const file of files) {
            const storageRef = ref(storage, `proposal-attachments/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            attachments.push({ name: file.name, url });
        }
        return attachments;
    };

    const onSubmit = async (data: ProposalFormValues) => {
        if (!user || !job) return;

        if (!user.stripeOnboardingComplete) {
            alert("応募するには、本人確認（Stripe連携）を完了させてください。");
            router.push("/account/worker/payout");
            return;
        }
        
        setSubmitting(true);
        try {
            const attachments = await uploadFiles(files);

            const proposalId = await createProposal({
                jobId: job.id,
                clientId: job.clientId,
                workerId: user.uid,
                workerName: user.displayName || "Unknown",
                workerPhotoURL: user.photoURL || "",
                price: data.price,
                message: data.message,
                estimatedDuration: data.estimatedDuration,
                status: "pending",
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
                attachments,
                negotiationHistory: [],
            });
            setHasApplied(true);
            
            alert("応募が完了しました！メッセージルームへ移動します。");
            router.push(`/messages/${proposalId}`);
        } catch (err) {
            console.error("Proposal creation failed:", err);
            alert(`エラーが発生しました: ${err instanceof Error ? err.message : "不明なエラー"}`);
        } finally {
            setSubmitting(false);
        }
    };

    const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            setFiles(prev => [...prev, ...newFiles]);
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    if (loading) return <div className="p-8 text-center">読み込み中...</div>;
    if (!job) return <div className="p-8 text-center">案件が見つかりません</div>;

    return (
        <div className="container mx-auto px-4 py-8">
            <Button variant="ghost" className="mb-4 pl-0" onClick={() => router.back()}>
                <ArrowLeft size={20} className="mr-2" />
                戻る
            </Button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Job Details */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                <CardTitle className="text-2xl font-bold text-secondary">{job.title}</CardTitle>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${job.status === 'open' ? 'bg-green-100 text-green-800' :
                                    job.status === 'filled' ? 'bg-blue-100 text-blue-800' :
                                        'bg-gray-100 text-gray-800'
                                    }`}>
                                    {job.status === 'open' ? '募集中' :
                                        job.status === 'filled' ? '契約中' : '終了'}
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex flex-col sm:flex-row flex-wrap gap-4 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                    <DollarSign size={16} />
                                    <span>予算: {job.budget?.toLocaleString()}円 (固定報酬)</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Calendar size={16} />
                                    <span>期限: {job.deadline?.toDate ? job.deadline.toDate().toLocaleDateString() : '未設定'}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Clock size={16} />
                                    <span>掲載日: {job.createdAt?.toDate ? job.createdAt.toDate().toLocaleDateString() : '不明'}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="text-sm text-gray-600">クライアント:</span>
                                    <Link href={`/users/${job.clientId}`} className="text-primary hover:underline font-medium">
                                        {job.clientName}
                                    </Link>
                                </div>
                            </div>

                            <div className="prose max-w-none">
                                <h3 className="text-lg font-semibold mb-2">依頼詳細</h3>
                                <p className="whitespace-pre-wrap text-gray-700">{job.description}</p>
                            </div>

                            <div>
                                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                    <Tag size={16} /> 関連タグ
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {Array.isArray(job.tags) && job.tags.map(tag => (
                                        <span key={tag} className="px-2 py-1 bg-gray-100 text-xs rounded text-gray-600 whitespace-nowrap">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {job.attachments && job.attachments.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                        <Paperclip size={16} /> 添付ファイル
                                    </h3>
                                    <div className="space-y-2">
                                        {job.attachments.map((att, index) => (
                                            <a 
                                                key={index} 
                                                href={att.url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors text-sm text-primary"
                                            >
                                                <Download size={14} />
                                                <span>{att.name}</span>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Application Form */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-xl font-bold text-secondary">この案件に応募する</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {hasApplied ? (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle className="text-green-600" size={32} />
                                    </div>
                                    <h3 className="text-lg font-bold text-green-800 mb-2">応募済み</h3>
                                    <p className="text-gray-600 mb-4">この案件には既に応募しています。</p>
                                    <div className="flex flex-col gap-2">
                                        {(proposalId || contractId) && (
                                            <Link href={`/messages/${contractId || proposalId}`}>
                                                <Button variant="outline" className="w-full">
                                                    <MessageSquare size={16} className="mr-2" />
                                                    クライアントにメッセージ
                                                </Button>
                                            </Link>
                                        )}
                                        <Link href="/worker/applications">
                                            <Button variant="outline" className="w-full">応募管理へ</Button>
                                        </Link>
                                        {contractId && (
                                            <Link href={`/worker/contracts/${contractId}`}>
                                                <Button className="w-full bg-accent hover:bg-accent/90 text-white">契約詳細・納品へ</Button>
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            ) : job.status !== 'open' ? (
                                <div className="text-center py-8 text-gray-500">
                                    この案件は現在募集していません。
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                    {!user?.stripeOnboardingComplete && (
                                        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg mb-4">
                                            <p className="text-sm font-medium">
                                                応募するには、本人確認（Stripe連携）が必要です。
                                            </p>
                                            <Link href="/account/worker/payout" className="text-sm underline mt-1 inline-block">
                                                設定ページへ移動
                                            </Link>
                                        </div>
                                    )}

                                    <Input
                                        label="提案金額 (円)"
                                        type="number"
                                        placeholder="50000"
                                        error={errors.price?.message}
                                        {...register("price", { valueAsNumber: true })}
                                    />

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">完了予定日</label>
                                        <Input
                                            type="date"
                                            error={errors.estimatedDuration?.message}
                                            {...register("estimatedDuration")}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">メッセージ</label>
                                        <textarea
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 h-32 focus:border-primary focus:ring-1 focus:ring-primary"
                                            placeholder="自己PRや提案内容を入力してください"
                                            {...register("message")}
                                        />
                                        {errors.message && <p className="mt-1 text-sm text-danger">{errors.message.message}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            添付ファイル (任意)
                                        </label>
                                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-primary transition-colors">
                                            <input
                                                type="file"
                                                multiple
                                                className="hidden"
                                                id="proposal-file-upload"
                                                onChange={onFileSelect}
                                            />
                                            <label
                                                htmlFor="proposal-file-upload"
                                                className="cursor-pointer flex flex-col items-center justify-center gap-2"
                                            >
                                                <Upload className="h-6 w-6 text-gray-400" />
                                                <span className="text-sm text-gray-600">
                                                    ファイルを選択 (複数可)
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

                                    <Button type="submit" className="w-full" disabled={submitting || !user?.stripeOnboardingComplete}>
                                        {submitting ? "送信中..." : "応募する"}
                                    </Button>
                                </form>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
