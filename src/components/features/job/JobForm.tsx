"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { createJob } from "@/lib/db";
import { Job } from "@/types";
import { useAuth } from "@/components/providers/AuthProvider";
import { Timestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { Upload, X, FileText } from "lucide-react";

export function JobForm() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    category: string;
    budget: string;
    deadline: string;
    type: "project";
  }>({
    title: "",
    description: "",
    category: "development",
    budget: "",
    deadline: "",
    type: "project",
  });

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
      const storageRef = ref(storage, `job-attachments/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      attachments.push({ name: file.name, url });
    }
    return attachments;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const attachments = await uploadFiles(files);

      const jobId = await createJob({
        clientId: user.uid,
        clientName: user.displayName || "Unknown Client",
        clientPhotoURL: user.photoURL || "",
        title: formData.title,
        description: formData.description,
        category: formData.category,
        tags: [], // TODO: Add tags input
        attachments,
        type: "project",
        budgetType: "fixed",
        budget: Number(formData.budget),
        deadline: Timestamp.fromDate(new Date(formData.deadline)),
        status: "open",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        proposalCount: 0,
      });
      router.push(`/client/jobs/${jobId}`);
    } catch (error) {
      console.error("Failed to create job:", error);
      alert("案件の作成に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            タイトル
          </label>
          <Input
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="例: Reactを使用したWebサイト制作"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            詳細
          </label>
          <textarea
            required
            className="w-full rounded-lg border-gray-300 focus:border-primary focus:ring-primary min-h-[200px]"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="依頼内容の詳細を入力してください"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              カテゴリー
            </label>
            <select
              className="w-full rounded-lg border-gray-300 focus:border-primary focus:ring-primary"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
              <option value="development">システム開発</option>
              <option value="design">デザイン</option>
              <option value="writing">ライティング</option>
              <option value="marketing">マーケティング</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              形式
            </label>
            <select
              className="w-full rounded-lg border-gray-300 focus:border-primary focus:ring-primary"
              value={formData.type}
              disabled
            >
              <option value="project">プロジェクト方式（固定報酬制）</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">※現在はプロジェクト方式のみ対応しています</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              予算 (円)
            </label>
            <Input
              type="number"
              required
              min="1000"
              value={formData.budget}
              onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
              placeholder="50000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              募集期限
            </label>
            <Input
              type="date"
              required
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
            />
          </div>
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
              id="job-file-upload"
              onChange={handleFileSelect}
            />
            <label
              htmlFor="job-file-upload"
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

        <div className="pt-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "作成中..." : "依頼を作成する"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
