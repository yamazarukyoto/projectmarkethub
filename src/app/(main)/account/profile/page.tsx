"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { updateUser } from "@/lib/db";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

export default function ProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    nameKana: "",
    postalCode: "",
    prefecture: "",
    city: "",
    building: "",
    phoneNumber: "",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        nameKana: user.nameKana || "",
        postalCode: user.address?.postalCode || "",
        prefecture: user.address?.prefecture || "",
        city: user.address?.city || "",
        building: user.address?.building || "",
        phoneNumber: user.phoneNumber || "",
      });
    }
  }, [user]);

  const PREFECTURES = [
    "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
    "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
    "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県",
    "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県",
    "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県",
    "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県",
    "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"
  ];

  const handlePostalCodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const value = input.replace(/-/g, "");

    // Update state immediately
    setFormData(prev => ({ ...prev, postalCode: input }));

    if (value.length === 7) {
      try {
        const response = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${value}`);
        const data = await response.json();
        if (data.results && data.results[0]) {
          const { address1, address2, address3 } = data.results[0];
          setFormData(prev => ({
            ...prev,
            prefecture: address1,
            city: address2 + address3
          }));
        }
      } catch (error) {
        console.error("Failed to fetch address:", error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    try {
      await updateUser(user.uid, {
        name: formData.name,
        nameKana: formData.nameKana,
        phoneNumber: formData.phoneNumber,
        address: {
          postalCode: formData.postalCode,
          prefecture: formData.prefecture,
          city: formData.city,
          building: formData.building,
        },
        updatedAt: new Date() as any, // Timestamp conversion handled by Firestore or need import
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
      <h1 className="text-2xl font-bold text-secondary mb-6">基本情報編集</h1>
      <Card className="max-w-2xl p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                氏名 (漢字) <span className="text-red-500">*</span>
              </label>
              <Input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="山田 太郎"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                氏名 (カナ) <span className="text-red-500">*</span>
              </label>
              <Input
                required
                value={formData.nameKana}
                onChange={(e) => setFormData({ ...formData, nameKana: e.target.value })}
                placeholder="ヤマダ タロウ"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              電話番号 <span className="text-red-500">*</span>
            </label>
            <Input
              required
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              placeholder="09012345678"
            />
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-medium mb-4">住所</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  郵便番号 <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  value={formData.postalCode}
                  onChange={handlePostalCodeChange}
                  placeholder="1234567"
                  maxLength={8}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  都道府県 <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full rounded-lg border-gray-300 focus:border-primary focus:ring-primary"
                  value={formData.prefecture}
                  onChange={(e) => setFormData({ ...formData, prefecture: e.target.value })}
                  required
                >
                  <option value="">選択してください</option>
                  {PREFECTURES.map((pref) => (
                    <option key={pref} value={pref}>
                      {pref}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  市区町村・番地 <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="千代田区千代田1-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  建物名・部屋番号
                </label>
                <Input
                  value={formData.building}
                  onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                  placeholder="パレスサイドビル 101"
                />
              </div>
            </div>
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
