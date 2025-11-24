"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { createJob } from "@/lib/db"; // 仮のインポート
import { Job } from "@/types";

export function JobForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "development",
    budget: "",
    deadline: "",
    type: "project" as const,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // TODO: Implement job creation logic
      // const jobId = await createJob({
      //   ...formData,
      //   budget: Number(formData.budget),
      //   deadline: new Date(formData.deadline),
      // });
      // router.push(`/client/jobs/${jobId}`);
      console.log("Job creation not implemented yet", formData);
    } catch (error) {
      console.error("Failed to create job:", error);
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
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
            >
              <option value="project">プロジェクト方式</option>
              <option value="competition">コンペ方式</option>
              <option value="task">タスク方式</option>
            </select>
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

        <div className="pt-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "作成中..." : "依頼を作成する"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
