"use client";

import { useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { deleteUser, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AlertTriangle, Trash2 } from "lucide-react";

export default function WithdrawPage() {
    const { firebaseUser } = useAuth();
    const router = useRouter();
    const [password, setPassword] = useState("");
    const [confirmText, setConfirmText] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState<1 | 2>(1);

    const handleWithdraw = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firebaseUser || !password) return;

        if (confirmText !== "退会する") {
            setError("確認テキストが正しくありません");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // 再認証
            const credential = EmailAuthProvider.credential(firebaseUser.email!, password);
            await reauthenticateWithCredential(firebaseUser, credential);

            // Firestoreのユーザーデータを削除
            await deleteDoc(doc(db, "users", firebaseUser.uid));

            // Firebaseユーザーを削除
            await deleteUser(firebaseUser);

            // ログインページにリダイレクト
            router.push("/login?message=account_deleted");
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "エラーが発生しました";
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">退会申請</h1>

            <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
                <div className="flex items-start gap-4">
                    <AlertTriangle className="text-red-500 flex-shrink-0 mt-1" size={24} />
                    <div>
                        <h2 className="text-lg font-semibold text-red-700 mb-2">退会に関する重要なお知らせ</h2>
                        <ul className="text-sm text-red-600 space-y-2">
                            <li>• 退会すると、アカウントに関連するすべてのデータが削除されます</li>
                            <li>• 進行中の契約がある場合は、退会できません</li>
                            <li>• 未払いの報酬がある場合は、先に振込申請を行ってください</li>
                            <li>• 退会後のデータ復旧はできません</li>
                        </ul>
                    </div>
                </div>
            </div>

            {step === 1 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">退会手続きを開始</h2>
                    <p className="text-gray-600 mb-6">
                        退会手続きを進める前に、上記の注意事項をよくお読みください。
                        退会を希望される場合は、下のボタンをクリックしてください。
                    </p>
                    <button
                        onClick={() => setStep(2)}
                        className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                    >
                        <Trash2 size={18} />
                        退会手続きを進める
                    </button>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">退会の最終確認</h2>
                    
                    {error && (
                        <div className="bg-red-50 text-red-700 border border-red-200 p-4 rounded-lg mb-4">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleWithdraw} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                パスワード
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                placeholder="現在のパスワードを入力"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                確認のため「退会する」と入力してください
                            </label>
                            <input
                                type="text"
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                placeholder="退会する"
                                required
                            />
                        </div>
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                キャンセル
                            </button>
                            <button
                                type="submit"
                                disabled={loading || confirmText !== "退会する"}
                                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? "処理中..." : "退会する"}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
