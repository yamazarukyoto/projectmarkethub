import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, FieldValue } from "@/lib/firebase-admin";
import { createRefund } from "@/lib/stripe";

// 管理者メールアドレス
const ADMIN_EMAIL = "yamazarukyoto@gmail.com";

export async function POST(req: NextRequest) {
    try {
        // 1. 認証チェック
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(token);
        const userEmail = decodedToken.email;

        // 2. 管理者権限チェック
        if (userEmail !== ADMIN_EMAIL) {
            return NextResponse.json({ error: "Forbidden - 管理者権限が必要です" }, { status: 403 });
        }

        // 3. リクエストボディ取得
        const { contractId, reason, refund } = await req.json();
        if (!contractId) {
            return NextResponse.json({ error: "Contract ID is required" }, { status: 400 });
        }

        // 4. 契約情報取得
        const contractRef = adminDb.collection("contracts").doc(contractId);
        const contractDoc = await contractRef.get();
        if (!contractDoc.exists) {
            return NextResponse.json({ error: "Contract not found" }, { status: 404 });
        }
        const contract = contractDoc.data();

        // 5. 既にキャンセル済みかチェック
        if (contract?.status === 'cancelled') {
            return NextResponse.json({ 
                error: "この契約は既にキャンセル済みです。" 
            }, { status: 400 });
        }

        // 6. 完了済みの場合は警告
        if (contract?.status === 'completed') {
            return NextResponse.json({ 
                error: "完了済みの契約はキャンセルできません。返金が必要な場合は別途対応してください。" 
            }, { status: 400 });
        }

        // 7. 返金処理（refund=trueかつ仮決済済みの場合）
        let refundResult = null;
        if (refund && contract?.stripePaymentIntentId) {
            const paymentIntentId = contract.stripePaymentIntentId;
            try {
                refundResult = await createRefund(
                    paymentIntentId,
                    undefined, // 全額返金
                    {
                        contractId: contractId,
                        reason: 'admin_force_cancellation',
                        adminReason: reason || '運営による強制キャンセル'
                    }
                );
                
                if (refundResult.status !== "succeeded" && refundResult.status !== "pending") {
                    console.error("Refund failed:", refundResult);
                    return NextResponse.json({ 
                        error: "返金処理に失敗しました。Stripeダッシュボードで確認してください。",
                        refundStatus: refundResult.status
                    }, { status: 500 });
                }
            } catch (refundError) {
                console.error("Refund error:", refundError);
                return NextResponse.json({ 
                    error: "返金処理中にエラーが発生しました。",
                    details: refundError instanceof Error ? refundError.message : 'Unknown error'
                }, { status: 500 });
            }
        }

        // 8. 契約をキャンセル状態に更新
        const updateData: Record<string, unknown> = {
            status: 'cancelled',
            cancelledAt: FieldValue.serverTimestamp(),
            cancelReason: reason || '運営による強制キャンセル',
            cancelApprovedBy: 'admin',
            cancelApprovedAt: FieldValue.serverTimestamp(),
        };

        if (refundResult) {
            updateData.stripeRefundId = refundResult.id;
        }

        await contractRef.update(updateData);

        // 9. 関連する通報があれば対応済みに更新
        const reportsSnapshot = await adminDb.collection("reports")
            .where("contractId", "==", contractId)
            .where("status", "==", "pending")
            .get();
        
        for (const reportDoc of reportsSnapshot.docs) {
            await reportDoc.ref.update({
                status: 'resolved',
                resolvedAt: FieldValue.serverTimestamp(),
                resolution: '強制キャンセル・返金処理を実行',
            });
        }

        const message = refundResult 
            ? "強制キャンセルと返金処理が完了しました。" 
            : "強制キャンセルが完了しました。";

        return NextResponse.json({ 
            success: true, 
            message,
            refunded: !!refundResult,
            refundId: refundResult?.id
        });

    } catch (error: unknown) {
        console.error("Error force cancelling:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
