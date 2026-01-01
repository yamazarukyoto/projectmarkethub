"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Building2, Globe, MapPin, Phone, Save } from "lucide-react";

interface ClientProfile {
    companyName?: string;
    website?: string;
    companyAddress?: string;
    companyPhone?: string;
    description?: string;
    industry?: string;
}

export default function ClientProfilePage() {
    const { firebaseUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [profile, setProfile] = useState<ClientProfile>({
        companyName: "",
        website: "",
        companyAddress: "",
        companyPhone: "",
        description: "",
        industry: "",
    });

    useEffect(() => {
        const fetchProfile = async () => {
            if (!firebaseUser) return;

            try {
                const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    // clientProfileオブジェクトから読み取る（フォールバックとしてフラット構造も対応）
                    const clientProfile = data.clientProfile || {};
                    setProfile({
                        companyName: clientProfile.companyName || data.companyName || "",
                        website: clientProfile.website || data.companyWebsite || "",
                        companyAddress: clientProfile.companyAddress || data.companyAddress || "",
                        companyPhone: clientProfile.companyPhone || data.companyPhone || "",
                        description: clientProfile.description || data.companyDescription || "",
                        industry: clientProfile.industry || data.industry || "",
                    });
                }
            } catch (error) {
                console.error("Error fetching profile:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [firebaseUser]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firebaseUser) return;

        setSaving(true);
        setMessage(null);

        try {
            // clientProfileオブジェクトとして保存（設計書に準拠）
            await updateDoc(doc(db, "users", firebaseUser.uid), {
                clientProfile: {
                    companyName: profile.companyName,
                    website: profile.website,
                    companyAddress: profile.companyAddress,
                    companyPhone: profile.companyPhone,
                    description: profile.description,
                    industry: profile.industry,
                },
                updatedAt: new Date(),
            });
            setMessage({ type: "success", text: "クライアントプロフィールを更新しました" });
        } catch (error) {
            console.error("Error updating profile:", error);
            setMessage({ type: "error", text: "更新に失敗しました" });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">クライアントプロフィール</h1>

            {message && (
                <div
                    className={`p-4 rounded-lg mb-6 ${
                        message.type === "success"
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                >
                    {message.text}
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            <Building2 size={16} className="inline mr-2" />
                            会社名・屋号
                        </label>
                        <input
                            type="text"
                            value={profile.companyName}
                            onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="株式会社〇〇"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            業種
                        </label>
                        <select
                            value={profile.industry}
                            onChange={(e) => setProfile({ ...profile, industry: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        >
                            <option value="">選択してください</option>
                            <option value="it">IT・通信</option>
                            <option value="manufacturing">製造業</option>
                            <option value="retail">小売・卸売</option>
                            <option value="service">サービス業</option>
                            <option value="finance">金融・保険</option>
                            <option value="real_estate">不動産</option>
                            <option value="construction">建設</option>
                            <option value="medical">医療・福祉</option>
                            <option value="education">教育</option>
                            <option value="media">メディア・広告</option>
                            <option value="other">その他</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            <Globe size={16} className="inline mr-2" />
                            Webサイト
                        </label>
                        <input
                            type="url"
                            value={profile.website}
                            onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="https://example.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            <MapPin size={16} className="inline mr-2" />
                            所在地
                        </label>
                        <input
                            type="text"
                            value={profile.companyAddress}
                            onChange={(e) => setProfile({ ...profile, companyAddress: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="東京都渋谷区..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            <Phone size={16} className="inline mr-2" />
                            電話番号
                        </label>
                        <input
                            type="tel"
                            value={profile.companyPhone}
                            onChange={(e) => setProfile({ ...profile, companyPhone: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="03-1234-5678"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            会社紹介
                        </label>
                        <textarea
                            value={profile.description}
                            onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                            rows={4}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="会社の事業内容や特徴を入力してください"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        <Save size={18} />
                        {saving ? "保存中..." : "保存する"}
                    </button>
                </form>
            </div>
        </div>
    );
}
