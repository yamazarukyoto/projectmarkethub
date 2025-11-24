"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function NotificationSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    emailMessage: true,
    emailContract: true,
    emailScout: true,
    emailDaily: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // TODO: Implement update logic
      console.log("Update notification settings", settings);
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert("保存しました");
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-secondary mb-6">通知設定</h1>
      <Card className="max-w-2xl p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between py-4 border-b border-gray-100">
              <div>
                <h3 className="font-medium text-gray-900">重要なお知らせ</h3>
                <p className="text-sm text-gray-500">運営からの重要なお知らせは常に受信します。</p>
              </div>
              <div className="relative inline-flex items-center cursor-not-allowed opacity-50">
                <input type="checkbox" className="sr-only peer" checked disabled />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </div>
            </div>

            <div className="flex items-center justify-between py-4 border-b border-gray-100">
              <div>
                <h3 className="font-medium text-gray-900">メッセージ受信</h3>
                <p className="text-sm text-gray-500">クライアントやワーカーからのメッセージ通知。</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={settings.emailMessage}
                  onChange={(e) => setSettings({ ...settings, emailMessage: e.target.checked })}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="flex items-center justify-between py-4 border-b border-gray-100">
              <div>
                <h3 className="font-medium text-gray-900">契約・業務連絡</h3>
                <p className="text-sm text-gray-500">契約締結、仮払い、検収などの重要通知。</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={settings.emailContract}
                  onChange={(e) => setSettings({ ...settings, emailContract: e.target.checked })}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="flex items-center justify-between py-4 border-b border-gray-100">
              <div>
                <h3 className="font-medium text-gray-900">スカウトメール</h3>
                <p className="text-sm text-gray-500">クライアントからのスカウト通知。</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={settings.emailScout}
                  onChange={(e) => setSettings({ ...settings, emailScout: e.target.checked })}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="flex items-center justify-between py-4">
              <div>
                <h3 className="font-medium text-gray-900">デイリーサマリー</h3>
                <p className="text-sm text-gray-500">おすすめ案件などのまとめメール。</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={settings.emailDaily}
                  onChange={(e) => setSettings({ ...settings, emailDaily: e.target.checked })}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>

          <div className="pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? "保存中..." : "設定を保存する"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
