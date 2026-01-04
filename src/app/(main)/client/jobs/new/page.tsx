"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/components/providers/AuthProvider";
import { createJob } from "@/lib/db";
import { storage, auth } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Timestamp } from "firebase/firestore";
import { Upload, X, FileText } from "lucide-react";
import { PaymentModal } from "@/components/features/contract/PaymentModal";

// カテゴリーの日本語マッピング
const categoryLabels: { [key: string]: string } = {
    'web_dev': 'Web開発',
    'design': 'デザイン',
    'writing': 'ライティング',
    'video': '動画編集',
    'other': 'その他',
};

const jobSchema = z.object({
    title: z.string().min(1, "タイトルを入力してください"),
    description: z.string().min(1, "詳細を入力してください"),
    category: z.string().min(1, "カテゴリーを選択してください"),
    type: z.literal("project"),
    budgetType: z.literal("fixed").optional(),
    budget: z.number().min(1, "予算金額を入力してください"),
    deadline: z.string().min(1, "期限を入力してください"),
    tags: z.string(), // Comma separated
});

type JobFormValues = z.infer<typeof jobSchema>;

export default function PostJobPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [createdJobId, setCreatedJobId] = useState<string | null>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [pendingJobData, setPendingJobData] = useState<JobFormValues | null>(null);

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm<JobFormValues>({
        resolver: zodResolver(jobSchema),
        defaultValues: {
            type: "project",
            budgetType: "fixed",
        },
    });

    useEffect(() => {
        setValue("budgetType", "fixed");
        setValue("type", "project");
    }, [setValue]);

    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const onDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const newFiles = Array.from(e.dataTransfer.files);
            setFiles(prev => [...prev, ...newFiles]);
        }
    }, []);

    const onFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            setFiles(prev => [...prev, ...newFiles]);
        }
    }, []);

    const removeFile = useCallback((index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    }, []);

    const uploadFiles = async (files: File[]): Promise<string[]> => {
        const urls: string[] = [];
        for (const file of files) {
            const storageRef = ref(storage, `job-attachments/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            urls.push(url);
        }
        return urls;
    };

    const onSubmit = (data: JobFormValues) => {
        setPendingJobData(data);
        setIsConfirmModalOpen(true);
    };

    const handleConfirmSubmit = async () => {
        if (!user || !pendingJobData) {
            alert("ログインしてください");
            return;
        }
        setIsConfirmModalOpen(false);
        setIsLoading(true);
        try {
            // Upload files first
            const attachmentUrls = await uploadFiles(files);

            const jobData: any = {
                clientId: user.uid,
                clientName: user.displayName,
                clientPhotoURL: user.photoURL,
                title: pendingJobData.title,
                description: pendingJobData.description,
                category: pendingJobData.category,
                type: "project",
                budgetType: "fixed",
                budget: pendingJobData.budget,
                deadline: Timestamp.fromDate(new Date(pendingJobData.deadline)),
                status: "open",
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
                tags: pendingJobData.tags.split(",").map(t => t.trim()).filter(t => t),
                attachments: attachmentUrls,
            };

            console.log("Creating job...", jobData);
            const jobId = await createJob(jobData);
            console.log("Job created successfully", jobId);

            alert("依頼を投稿しました！");
            router.push("/client/dashboard");
        } catch (err) {
            console.error("Error creating job:", err);
            alert(`エラーが発生しました: ${err instanceof Error ? err.message : "不明なエラー"}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePayment = async (jobId: string, amount: number) => {
        try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch("/api/stripe/create-payment-intent", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ jobId, amount }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            if (data.skipped) {
                alert("仮決済（デモ）が完了し、募集を開始しました！");
                router.push("/client/dashboard");
                return;
            }

            setClientSecret(data.clientSecret);
            setIsPaymentModalOpen(true);
        } catch (error) {
            console.error("Error creating payment intent:", error);
            alert(`仮決済準備中にエラーが発生しました: ${error instanceof Error ? error.message : "不明なエラー"}`);
            setIsLoading(false); // Ensure loading state is reset on error
        }
    };

    const handlePaymentSuccess = async () => {
        setIsPaymentModalOpen(false);
        
        // 決済完了を確認してステータスを更新する
        try {
            if (createdJobId) {
                const token = await auth.currentUser?.getIdToken();
                await fetch("/api/stripe/verify-payment", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ jobId: createdJobId }),
                });
            }
            alert("仮決済が完了し、募集を開始しました！");
            router.push("/client/dashboard");
        } catch (error) {
            console.error("Error verifying payment:", error);
            // 決済自体は成功しているので、ダッシュボードへ誘導
            alert("仮決済が完了しました。募集開始まで少し時間がかかる場合があります。");
            router.push("/client/dashboard");
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-3xl">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-secondary">仕事を依頼する</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit, (errors) => console.error("Validation errors:", errors))} className="space-y-6">
                        <Input
                            label="タイトル"
                            placeholder="例: Reactを使ったWebアプリ開発"
                            error={errors.title?.message}
                            {...register("title")}
                        />

                        <input type="hidden" {...register("type")} value="project" />

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">詳細</label>
                            <textarea
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 h-32 focus:border-primary focus:ring-1 focus:ring-primary"
                                placeholder="依頼内容の詳細を入力してください"
                                {...register("description")}
                            />
                            {errors.description && <p className="mt-1 text-sm text-danger">{errors.description.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">添付資料</label>
                            <div
                                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                                    isDragging ? "border-primary bg-primary/5" : "border-gray-300 hover:border-primary"
                                }`}
                                onDragOver={onDragOver}
                                onDragLeave={onDragLeave}
                                onDrop={onDrop}
                            >
                                <input
                                    type="file"
                                    multiple
                                    className="hidden"
                                    id="file-upload"
                                    onChange={onFileSelect}
                                />
                                <label
                                    htmlFor="file-upload"
                                    className="cursor-pointer flex flex-col items-center justify-center gap-2"
                                >
                                    <Upload className="h-8 w-8 text-gray-400" />
                                    <span className="text-sm text-gray-600">
                                        クリックしてファイルを選択するか、ここにドラッグ＆ドロップしてください
                                    </span>
                                </label>
                            </div>
                            {files.length > 0 && (
                                <div className="mt-4 space-y-2">
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリー</label>
                                <select
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary"
                                    {...register("category")}
                                >
                                    <option value="">選択してください</option>
                                    <option value="web_dev">Web開発</option>
                                    <option value="design">デザイン</option>
                                    <option value="writing">ライティング</option>
                                    <option value="video">動画編集</option>
                                    <option value="other">その他</option>
                                </select>
                                {errors.category && <p className="mt-1 text-sm text-danger">{errors.category.message}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">期限</label>
                                <input
                                    type="date"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary"
                                    {...register("deadline")}
                                />
                                {errors.deadline && <p className="mt-1 text-sm text-danger">{errors.deadline.message}</p>}
                            </div>
                        </div>

                        <div className="space-y-4 border-t pt-4">
                            <h3 className="font-medium text-gray-900">報酬設定</h3>
                            <Input
                                label="予算金額 (税込・円)"
                                type="number"
                                placeholder="55000"
                                error={errors.budget?.message}
                                {...register("budget", { valueAsNumber: true })}
                            />
                            <p className="text-xs text-gray-500">※ 税込金額を入力してください。消費税10%が含まれます。</p>
                        </div>

                        <Input
                            label="タグ (カンマ区切り)"
                            placeholder="React, TypeScript, Firebase"
                            {...register("tags")}
                        />

                        <div className="flex justify-end gap-4 pt-4">
                            <Button type="button" variant="ghost" onClick={() => router.back()}>
                                キャンセル
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? "送信中..." : "依頼を投稿する"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {clientSecret && (
                <PaymentModal
                    isOpen={isPaymentModalOpen}
                    onClose={() => setIsPaymentModalOpen(false)}
                    clientSecret={clientSecret}
                    onSuccess={handlePaymentSuccess}
                />
            )}

            {/* Confirmation Modal */}
            {isConfirmModalOpen && pendingJobData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h3 className="text-lg font-semibold text-gray-900">依頼内容の確認</h3>
                            <button onClick={() => setIsConfirmModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <h4 className="text-sm font-bold text-gray-500">タイトル</h4>
                                <p className="text-lg font-medium">{pendingJobData.title}</p>
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-gray-500">詳細</h4>
                                <div className="max-h-32 overflow-y-auto bg-gray-50 p-3 rounded-lg text-sm text-gray-700 whitespace-pre-wrap">
                                    {pendingJobData.description}
                                </div>
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-gray-500">カテゴリー</h4>
                                <p>{categoryLabels[pendingJobData.category] || pendingJobData.category}</p>
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-gray-500">期限</h4>
                                <p>{pendingJobData.deadline}</p>
                            </div>
                            {files.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-bold text-gray-500">添付ファイル</h4>
                                    <div className="mt-1 space-y-1">
                                        {files.map((file, index) => (
                                            <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                                                <FileText className="h-4 w-4 text-gray-400" />
                                                <span className="truncate">{file.name}</span>
                                                <span className="text-xs text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="bg-gray-50 p-4 rounded-lg border">
                                <h4 className="text-sm font-bold text-gray-900 mb-2">お支払い金額（概算）</h4>
                                <div className="space-y-1">
                                    <div className="flex justify-between font-bold text-lg">
                                        <span>予算金額 (税込)</span>
                                        <span>{pendingJobData.budget?.toLocaleString()} 円</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-gray-500 border-t pt-2 mt-2">
                                        <span>（税抜: {Math.round((pendingJobData.budget || 0) / 1.1).toLocaleString()}円 / 消費税: {((pendingJobData.budget || 0) - Math.round((pendingJobData.budget || 0) / 1.1)).toLocaleString()}円）</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">※プロジェクト方式の場合、実際の契約金額はワーカーとの交渉により決定します。この段階では支払いは発生しません。</p>
                                </div>
                            </div>

                            <div className="flex justify-end gap-4 pt-4">
                                <Button variant="ghost" onClick={() => setIsConfirmModalOpen(false)}>
                                    修正する
                                </Button>
                                <Button onClick={handleConfirmSubmit} disabled={isLoading}>
                                    依頼を投稿する
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
