"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, limit, where } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Contract } from "@/types";
import { useAuth } from "@/components/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { RefreshCw, Ban, AlertTriangle } from "lucide-react";

const ADMIN_EMAIL = "yamazarukyoto@gmail.com";

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.email !== ADMIN_EMAIL)) {
      router.replace(user ? "/" : "/login?redirect=/admin");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (authLoading || !user || user.email !== ADMIN_EMAIL) return;

    const fetchContracts = async () => {
      try {
        // 全ての契約を取得（キャンセル・完了以外）
        const q = query(
          collection(db, "contracts"),
          orderBy("createdAt", "desc"),
          limit(100)
        );
        const snapshot = await getDocs(q);
        const contractList = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Contract))
          .filter(c => c.status !== 'cancelled' && c.status !== 'completed');
        setContracts(contractList);
      } catch (error) {
        console.error("Error fetching contracts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchContracts();
  }, [authLoading, user]);

  const handleForceCancel = async (withRefund: boolean) => {
    if (!selectedContract) return;

    const confirmMessage = withRefund
      ? "この契約を強制キャンセルし、クライアントに全額返金しますか？\n\nこの操作は取り消せません。"
      : "この契約を強制キャンセルしますか？（返金なし）\n\nこの操作は取り消せません。";

    if (!confirm(confirmMessage)) return;

    setIsProcessing(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        alert("認証エラー: ログインし直してください。");
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${apiUrl}/api/admin/force-cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          contractId: selectedContract.id,
          reason: cancelReason || "運営による強制キャンセル",
          refund: withRefund,
        }),
      });

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }

      alert(data.message);
      // 契約リストを更新
      setContracts(contracts.filter(c => c.id !== selectedContract.id));
      setSelectedContract(null);
      setCancelReason("");
    } catch (error: unknown) {
      console.error("Error force cancelling:", error);
      alert(error instanceof Error ? error.message : "エラーが発生しました。");
    } finally {
      setIsProcessing(false);
    }
  };

  if (authLoading || !user || user.email !== ADMIN_EMAIL) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-secondary text-white p-4 rounded-t-lg">
          <h1 className="text-2xl font-bold">🔒 管理画面 - 強制返金</h1>
          <p className="text-sm text-gray-300">ログイン: {user.email}</p>
        </div>

        <div className="bg-white rounded-b-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4">進行中の契約一覧</h2>

          {loading ? (
            <div className="text-center py-8">読み込み中...</div>
          ) : contracts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">進行中の契約はありません</div>
          ) : (
            <div className="space-y-4">
              {contracts.map((contract) => (
                <Card
                  key={contract.id}
                  className={`cursor-pointer transition-all ${
                    selectedContract?.id === contract.id
                      ? "ring-2 ring-primary"
                      : "hover:shadow-md"
                  }`}
                  onClick={() => setSelectedContract(contract)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold">{contract.jobTitle}</h3>
                        <p className="text-sm text-gray-500">
                          契約ID: {contract.id.substring(0, 8)}...
                        </p>
                        <p className="text-sm text-gray-500">
                          金額: ¥{contract.totalAmount?.toLocaleString() || contract.amount?.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            contract.status === "disputed"
                              ? "bg-red-100 text-red-800"
                              : contract.cancelRequestedBy
                              ? "bg-orange-100 text-orange-800"
                              : contract.noContactReportedAt
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {contract.status === "disputed"
                            ? "トラブル中"
                            : contract.cancelRequestedBy
                            ? "キャンセル申請中"
                            : contract.noContactReportedAt
                            ? "連絡不通報告あり"
                            : contract.status}
                        </span>
                        {(contract.cancelRequestedBy || contract.noContactReportedAt) && (
                          <div className="mt-1">
                            <AlertTriangle size={16} className="text-orange-500 inline" />
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* 選択した契約の詳細と操作 */}
          {selectedContract && (
            <div className="mt-8 border-t pt-6">
              <h3 className="text-lg font-bold mb-4">選択した契約: {selectedContract.jobTitle}</h3>

              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div>
                  <span className="text-gray-500">契約ID:</span>
                  <span className="ml-2 font-mono">{selectedContract.id}</span>
                </div>
                <div>
                  <span className="text-gray-500">ステータス:</span>
                  <span className="ml-2">{selectedContract.status}</span>
                </div>
                <div>
                  <span className="text-gray-500">金額:</span>
                  <span className="ml-2">¥{selectedContract.totalAmount?.toLocaleString()}</span>
                </div>
                {selectedContract.stripePaymentIntentId && (
                  <div>
                    <span className="text-gray-500">PaymentIntent:</span>
                    <span className="ml-2 font-mono text-xs">{selectedContract.stripePaymentIntentId}</span>
                  </div>
                )}
              </div>

              {selectedContract.cancelReason && (
                <div className="bg-orange-50 p-3 rounded mb-4">
                  <p className="text-sm text-orange-800">
                    <strong>キャンセル理由:</strong> {selectedContract.cancelReason}
                  </p>
                </div>
              )}

              {selectedContract.noContactReportReason && (
                <div className="bg-yellow-50 p-3 rounded mb-4">
                  <p className="text-sm text-yellow-800">
                    <strong>連絡不通報告:</strong> {selectedContract.noContactReportReason}
                  </p>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  キャンセル理由（任意）
                </label>
                <textarea
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 h-20"
                  placeholder="キャンセル理由を入力..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
              </div>

              <div className="flex gap-4">
                {(selectedContract.status === "escrow" ||
                  selectedContract.status === "in_progress" ||
                  selectedContract.status === "disputed") && (
                  <Button
                    variant="danger"
                    onClick={() => handleForceCancel(true)}
                    disabled={isProcessing}
                  >
                    <RefreshCw size={16} className="mr-2" />
                    強制キャンセル＋全額返金
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => handleForceCancel(false)}
                  disabled={isProcessing}
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  <Ban size={16} className="mr-2" />
                  強制キャンセル（返金なし）
                </Button>
              </div>

              <p className="text-xs text-gray-500 mt-2">
                ※ 仮決済済み（escrow/in_progress/disputed）の場合のみ返金が可能です。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
