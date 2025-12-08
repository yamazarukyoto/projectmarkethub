"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CreditCard, Plus, Trash2, CheckCircle, AlertCircle } from "lucide-react";

interface PaymentMethod {
    id: string;
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
    isDefault: boolean;
}

export default function PaymentMethodPage() {
    const { firebaseUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [stripeCustomerId, setStripeCustomerId] = useState<string | null>(null);

    useEffect(() => {
        const fetchPaymentMethods = async () => {
            if (!firebaseUser) return;

            try {
                const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    setStripeCustomerId(data.stripeCustomerId || null);
                    
                    // 実際のStripe連携では、ここでStripe APIから支払い方法を取得
                    // 現在はモックデータを表示
                    if (data.stripeCustomerId) {
                        // TODO: Stripe APIから支払い方法を取得
                        setPaymentMethods([]);
                    }
                }
            } catch (error) {
                console.error("Error fetching payment methods:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPaymentMethods();
    }, [firebaseUser]);

    const handleAddPaymentMethod = async () => {
        // TODO: Stripe Elementsを使用してカード情報を追加
        alert("この機能は現在開発中です。Stripe決済時に自動的にカード情報が保存されます。");
    };

    const handleRemovePaymentMethod = async (paymentMethodId: string) => {
        // TODO: Stripe APIで支払い方法を削除
        console.log("Remove payment method:", paymentMethodId);
    };

    const handleSetDefault = async (paymentMethodId: string) => {
        // TODO: デフォルトの支払い方法を設定
        console.log("Set default payment method:", paymentMethodId);
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
            <h1 className="text-2xl font-bold text-gray-900 mb-6">支払い方法</h1>

            {/* Stripe連携状態 */}
            <div className={`p-4 rounded-lg mb-6 flex items-start gap-3 ${
                stripeCustomerId 
                    ? "bg-green-50 border border-green-200" 
                    : "bg-yellow-50 border border-yellow-200"
            }`}>
                {stripeCustomerId ? (
                    <>
                        <CheckCircle className="text-green-500 flex-shrink-0 mt-0.5" size={20} />
                        <div>
                            <p className="text-green-700 font-medium">Stripe連携済み</p>
                            <p className="text-green-600 text-sm">決済時に使用したカード情報が自動的に保存されます</p>
                        </div>
                    </>
                ) : (
                    <>
                        <AlertCircle className="text-yellow-500 flex-shrink-0 mt-0.5" size={20} />
                        <div>
                            <p className="text-yellow-700 font-medium">Stripe未連携</p>
                            <p className="text-yellow-600 text-sm">初回決済時にStripeアカウントが自動作成されます</p>
                        </div>
                    </>
                )}
            </div>

            {/* 登録済みカード一覧 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">登録済みカード</h2>
                    <button
                        onClick={handleAddPaymentMethod}
                        className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                    >
                        <Plus size={16} />
                        カードを追加
                    </button>
                </div>

                {paymentMethods.length === 0 ? (
                    <div className="p-8 text-center">
                        <CreditCard className="mx-auto text-gray-300 mb-4" size={48} />
                        <p className="text-gray-500 mb-2">登録済みのカードはありません</p>
                        <p className="text-gray-400 text-sm">
                            案件への支払い時にカード情報を入力すると、自動的に保存されます
                        </p>
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-100">
                        {paymentMethods.map((method) => (
                            <li key={method.id} className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-8 bg-gray-100 rounded flex items-center justify-center">
                                        <CreditCard size={20} className="text-gray-500" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">
                                            {method.brand} •••• {method.last4}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            有効期限: {method.expMonth}/{method.expYear}
                                        </p>
                                    </div>
                                    {method.isDefault && (
                                        <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                                            デフォルト
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {!method.isDefault && (
                                        <button
                                            onClick={() => handleSetDefault(method.id)}
                                            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                                        >
                                            デフォルトに設定
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleRemovePaymentMethod(method.id)}
                                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* 注意事項 */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 mb-2">ご利用について</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 決済はStripeを通じて安全に処理されます</li>
                    <li>• カード情報は当サイトには保存されません</li>
                    <li>• 対応カード: Visa, Mastercard, American Express, JCB</li>
                </ul>
            </div>
        </div>
    );
}
