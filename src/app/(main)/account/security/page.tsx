"use client";

import { useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { Lock, Mail, Eye, EyeOff } from "lucide-react";

export default function SecurityPage() {
    const { firebaseUser } = useAuth();
    const [currentPassword, setCurrentPassword] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [activeTab, setActiveTab] = useState<"email" | "password">("email");

    const handleEmailChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firebaseUser || !currentPassword || !newEmail) return;

        setLoading(true);
        setMessage(null);

        try {
            const credential = EmailAuthProvider.credential(firebaseUser.email!, currentPassword);
            await reauthenticateWithCredential(firebaseUser, credential);
            await updateEmail(firebaseUser, newEmail);
            setMessage({ type: "success", text: "メールアドレスを更新しました" });
            setNewEmail("");
            setCurrentPassword("");
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "エラーが発生しました";
            setMessage({ type: "error", text: errorMessage });
        } finally {
            setLoading(false);
        }
    };

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
            <h1 className="text-2xl font-bold text-gray-900 mb-6">メールアドレス・パスワード</h1>

            {/* タブ */}
            <div className="flex border-b border-gray-200 mb-6">
                <button
                    onClick={() => setActiveTab("email")}
                    className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                        activeTab === "email"
                            ? "border-primary text-primary"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                >
                    <Mail size={16} className="inline mr-2" />
                    メールアドレス変更
                </button>
                <button
                    onClick={() => setActiveTab("password")}
                    className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                        activeTab === "password"
                            ? "border-primary text-primary"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                >
                    <Lock size={16} className="inline mr-2" />
                    パスワード変更
                </button>
            </div>

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

            {activeTab === "email" ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">メールアドレスの変更</h2>
                    <p className="text-sm text-gray-600 mb-4">
                        現在のメールアドレス: <span className="font-medium">{firebaseUser?.email}</span>
                    </p>
                    <form onSubmit={handleEmailChange} className="space-y-4">
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
                                新しいメールアドレス
                            </label>
                            <input
                                type="email"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                            {loading ? "更新中..." : "メールアドレスを変更"}
                        </button>
                    </form>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">パスワードの変更</h2>
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
            )}
        </div>
    );
}
