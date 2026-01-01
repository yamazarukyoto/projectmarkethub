"use client";

import { useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { Lock, Eye, EyeOff } from "lucide-react";

export default function SecurityPage() {
    const { firebaseUser } = useAuth();
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firebaseUser || !currentPassword || !newPassword) return;

        if (newPassword !== confirmPassword) {
            setMessage({ type: "error", text: "新しいパスワードが一致しません" });
            return;
        }

        if (newPassword.length < 6) {
            setMessage({ type: "error", text: "パスワードは6文字以上で入力してください" });
            return;
        }

        setLoading(true);
        setMessage(null);

        try {
            const credential = EmailAuthProvider.credential(firebaseUser.email!, currentPassword);
            await reauthenticateWithCredential(firebaseUser, credential);
            await updatePassword(firebaseUser, newPassword);
            setMessage({ type: "success", text: "パスワードを更新しました" });
            setNewPassword("");
            setConfirmPassword("");
            setCurrentPassword("");
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "エラーが発生しました";
            setMessage({ type: "error", text: errorMessage });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">パスワード変更</h1>

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
                <div className="flex items-center gap-2 mb-4">
                    <Lock size={20} className="text-primary" />
                    <h2 className="text-lg font-semibold text-gray-900">パスワードの変更</h2>
                </div>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            現在のパスワード
                        </label>
                        <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            新しいパスワード
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent pr-10"
                                required
                                minLength={6}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            新しいパスワード（確認）
                        </label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            required
                            minLength={6}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                        {loading ? "更新中..." : "パスワードを変更"}
                    </button>
                </form>
            </div>
        </div>
    );
}
