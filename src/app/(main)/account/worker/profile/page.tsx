"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { updateUser } from "@/lib/db";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

export default function WorkerProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    displayName: "",
    title: "",
    bio: "",
    skills: "",
    hoursPerWeek: "10-20時間",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        displayName: user.displayName || "",
        title: user.workerProfile?.title || "",
        bio: user.workerProfile?.bio || "",
        skills: user.workerProfile?.skills?.join(", ") || "",
        hoursPerWeek: user.workerProfile?.hoursPerWeek || "10-20時間",
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      await updateUser(user.uid, {
        displayName: formData.displayName,
        workerProfile: {
          title: formData.title,
          bio: formData.bio,
          skills: formData.skills.split(",").map(s => s.trim()).filter(s => s),
          hoursPerWeek: formData.hoursPerWeek,
        },
        updatedAt: new Date() as any,
      });
      alert("保存しました");
    } catch (error) {
      console.error(error);
      alert("保存に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-secondary mb-6">ワーカープロフィール編集</h1>
      <Card className="max-w-2xl p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              表示名 <span className="text-red-500">*</span>
            </label>
            <Input
              required
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              placeholder="ニックネーム可"
            />
            <p className="text-xs text-gray-500 mt-1">クライアントに公開される名前です。</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              キャッチコピー <span className="text-red-500">*</span>
            </label>
            <Input
              required
              maxLength={50}
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="例: React/Next.jsが得意なフロントエンドエンジニア"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              自己紹介 <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-h-[200px]"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="経歴、得意分野、実績などを詳しく書いてください。"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              スキル
            </label>
            <Input
              value={formData.skills}
              onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
              placeholder="例: React, TypeScript, Node.js (カンマ区切り)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              稼働可能時間 <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              value={formData.hoursPerWeek}
              onChange={(e) => setFormData({ ...formData, hoursPerWeek: e.target.value })}
            >
              <option value="週10時間未満">週10時間未満</option>
              <option value="10-20時間">10-20時間</option>
              <option value="20-30時間">20-30時間</option>
              <option value="30時間以上">30時間以上</option>
            </select>
          </div>

          <div className="pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? "保存中..." : "変更を保存する"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
