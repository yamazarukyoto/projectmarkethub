"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/components/providers/AuthProvider";
import { createJob } from "@/lib/db";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Timestamp } from "firebase/firestore";
import { Upload, X, FileText } from "lucide-react";

const jobSchema = z.object({
    title: z.string().min(1, "タイトルを入力してください"),
    description: z.string().min(1, "詳細を入力してください"),
    category: z.string().min(1, "カテゴリーを選択してください"),
    type: z.enum(["project", "competition", "task"]),
    budgetType: z.literal("fixed").optional(),
    budget: z.number().optional(),
    deadline: z.string().min(1, "期限を入力してください"),
    tags: z.string(), // Comma separated
    
    // Task specific
    taskQuantity: z.number().optional(),
    taskUnitPrice: z.number().optional(),
    taskTimeLimit: z.number().optional(),
    taskQuestions: z.array(z.object({
        type: z.enum(["text", "radio", "checkbox"]),
        text: z.string().optional(),
        options: z.string().optional(), // Comma separated for radio/checkbox
    })).optional(),
}).superRefine((data, ctx) => {
    if (data.type === "task") {
        if (!data.taskQuantity) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "件数を入力してください",
                path: ["taskQuantity"],
            });
        }
        if (!data.taskUnitPrice) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "単価を入力してください",
                path: ["taskUnitPrice"],
            });
        }
        if (!data.taskTimeLimit) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "制限時間を入力してください",
                path: ["taskTimeLimit"],
            });
        }
        if (data.taskQuestions) {
            data.taskQuestions.forEach((q, index) => {
                if (!q.text || q.text.length < 1) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: "設問を入力してください",
                        path: ["taskQuestions", index, "text"],
                    });
                }
            });
        }
    }
    
    if (data.type === "project") {
        if (!data.budget) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "予算金額を入力してください",
                path: ["budget"],
            });
        }
    }

    if (data.type === "competition") {
        if (!data.budget) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "採用報酬額を入力してください",
                path: ["budget"],
            });
        }
    }
});

type JobFormValues = z.infer<typeof jobSchema>;

export default function PostJobPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const [isDragging, setIsDragging] = useState(false);

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        control,
        formState: { errors },
    } = useForm<JobFormValues>({
        resolver: zodResolver(jobSchema),
        defaultValues: {
            type: "project",
            budgetType: "fixed",
            taskQuestions: [{ type: "text", text: "" }],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "taskQuestions",
    });

    const selectedType = watch("type");

    useEffect(() => {
        setValue("budgetType", "fixed");
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

    const onSubmit = async (data: JobFormValues) => {
        console.log("Form submitted", data);
        if (!user) {
            alert("ログインしてください");
            return;
        }
        setIsLoading(true);
        try {
            // Upload files first
            const attachmentUrls = await uploadFiles(files);

            const jobData: any = {
                clientId: user.uid,
                clientName: user.displayName,
                clientPhotoURL: user.photoURL,
                title: data.title,
                description: data.description,
                category: data.category,
                type: data.type,
                budgetType: data.budgetType,
                deadline: Timestamp.fromDate(new Date(data.deadline)),
                status: "open",
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
                tags: data.tags.split(",").map(t => t.trim()).filter(t => t),
                attachments: attachmentUrls,
            };

            if (data.type === "project") {
                jobData.budget = data.budget;
            } else if (data.type === "competition") {
                jobData.budget = data.budget;
                jobData.competition = {
                    guaranteed: false, // Default
                };
            } else if (data.type === "task") {
                jobData.budget = (data.taskQuantity || 0) * (data.taskUnitPrice || 0);
                jobData.task = {
                    quantity: data.taskQuantity,
                    unitPrice: data.taskUnitPrice,
                    timeLimit: data.taskTimeLimit,
                    questions: data.taskQuestions?.map(q => ({
                        type: q.type,
                        text: q.text,
                        options: q.options ? q.options.split(",").map(o => o.trim()) : undefined,
                    })),
                };
            }

            console.log("Creating job...", jobData);
            await createJob(jobData);
            console.log("Job created successfully");
            alert("依頼を投稿しました！");
            router.push("/client/dashboard");
        } catch (err) {
            console.error("Error creating job:", err);
            alert(`エラーが発生しました: ${err instanceof Error ? err.message : "不明なエラー"}`);
        } finally {
            setIsLoading(false);
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

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">依頼形式</label>
                            <select
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary"
                                {...register("type")}
                            >
                                <option value="project">プロジェクト方式</option>
                                <option value="competition">コンペ方式</option>
                                <option value="task">タスク方式</option>
                            </select>
                            <p className="text-xs text-gray-500 mt-1">
                                {selectedType === "project" && "特定の一人と契約して仕事を進める形式です。"}
                                {selectedType === "competition" && "多数の提案を集めて採用する形式です。"}
                                {selectedType === "task" && "多数のワーカーに単純作業を依頼する形式です。"}
                            </p>
                        </div>

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

                        {/* Project Format Budget */}
                        {selectedType === "project" && (
                            <div className="space-y-4 border-t pt-4">
                                <h3 className="font-medium text-gray-900">報酬設定</h3>
                                <Input
                                    label="予算金額 (円)"
                                    type="number"
                                    placeholder="50000"
                                    error={errors.budget?.message}
                                    {...register("budget", { valueAsNumber: true })}
                                />
                            </div>
                        )}

                        {/* Competition Format Budget */}
                        {selectedType === "competition" && (
                            <div className="space-y-4 border-t pt-4">
                                <h3 className="font-medium text-gray-900">コンペ設定</h3>
                                <Input
                                    label="採用報酬額 (円)"
                                    type="number"
                                    placeholder="30000"
                                    error={errors.budget?.message}
                                    {...register("budget", { valueAsNumber: true })}
                                />
                            </div>
                        )}

                        {/* Task Format Settings */}
                        {selectedType === "task" && (
                            <div className="space-y-4 border-t pt-4">
                                <h3 className="font-medium text-gray-900">タスク設定</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Input
                                        label="単価 (円)"
                                        type="number"
                                        placeholder="50"
                                        {...register("taskUnitPrice", { valueAsNumber: true })}
                                    />
                                    <Input
                                        label="件数"
                                        type="number"
                                        placeholder="100"
                                        {...register("taskQuantity", { valueAsNumber: true })}
                                    />
                                    <Input
                                        label="制限時間 (分)"
                                        type="number"
                                        placeholder="60"
                                        {...register("taskTimeLimit", { valueAsNumber: true })}
                                    />
                                </div>
                                
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">設問</label>
                                    {fields.map((field, index) => (
                                        <div key={field.id} className="p-4 border rounded-lg space-y-2 bg-gray-50">
                                            <div className="flex justify-between">
                                                <span className="text-sm font-bold">設問 {index + 1}</span>
                                                <button type="button" onClick={() => remove(index)} className="text-xs text-danger">削除</button>
                                            </div>
                                            <select
                                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                                {...register(`taskQuestions.${index}.type`)}
                                            >
                                                <option value="text">テキスト入力</option>
                                                <option value="radio">選択式 (単一)</option>
                                                <option value="checkbox">選択式 (複数)</option>
                                            </select>
                                            <Input
                                                placeholder="質問文を入力"
                                                {...register(`taskQuestions.${index}.text`)}
                                            />
                                            <Input
                                                placeholder="選択肢 (カンマ区切り: A,B,C)"
                                                {...register(`taskQuestions.${index}.options`)}
                                            />
                                        </div>
                                    ))}
                                    <Button type="button" variant="outline" size="sm" onClick={() => append({ type: "text", text: "" })}>
                                        + 設問を追加
                                    </Button>
                                </div>
                            </div>
                        )}

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
        </div>
    );
}
