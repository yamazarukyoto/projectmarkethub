import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, FieldValue } from "@/lib/firebase-admin";
import { cancelOrRefundPaymentIntent } from "@/lib/stripe";

// CORSヘッダー
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// OPTIONSリクエスト（プリフライト）への対応
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// 管理者メールアドレス
const ADMIN_EMAIL = "yamazarukyoto@gmail.com";

export async function POST(req: NextRequest) {
    try {
        // 1. 認証チェック
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
        }
        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(token);
        const userEmail = decodedToken.email;

        // 2. 管理者権限チェック
        if (userEmail !== ADMIN_EMAIL) {
            return NextResponse.json({ error: "Forbidden - 管理者権限が必要です" }, { status: 403, headers: corsHeaders });
        }

        // 3. リクエストボディ取得
        const { contractId, reason, refund } = await req.json();
        if (!contractId) {
            return NextResponse.json({ error: "Contract ID is required" }, { status: 400, headers: corsHeaders });
        }

        // 4. 契約情報取得
        const contractRef = adminDb.collection("contracts").doc(contractId);
        const contractDoc = await contractRef.get();
        if (!contractDoc.exists) {
            return NextResponse.json({ error: "Contract not found" }, { status: 404, headers: corsHeaders });
        }
        const contract = contractDoc.data();

        // 5. 既にキャンセル済みかチェック
        if (contract?.status === 'cancelled') {
            return NextResponse.json({ 
                error: "この契約は既にキャンセル済みです。" 
            }, { status: 400, headers: corsHeaders });
        }

        // 6. 完了済みの場合は警告
        if (contract?.status === 'completed') {
            return NextResponse.json({ 
                error: "完了済みの契約はキャンセルできません。返金が必要な場合は別途対応してください。" 
            }, { status: 400, headers: corsHeaders });
        }

        // 7. 返金/キャンセル処理（refund=trueかつPaymentIntentがある場合）
        let cancelRefundResult: { action: 'cancelled' | 'refunded'; result: unknown } | null = null;
        if (refund && contract?.stripePaymentIntentId) {
            const paymentIntentId = contract.stripePaymentIntentId;
            try {
                cancelRefundResult = await cancelOrRefundPaymentIntent(
                    paymentIntentId,
                    {
                        contractId: contractId,
                        reason: 'admin_force_cancellation',
                        adminReason: reason || '運営による強制キャンセル'
                    }
                );
                
                console.log(`[Force Cancel] PaymentIntent ${paymentIntentId} ${cancelRefundResult.action}`);
            } catch (cancelRefundError) {
                console.error("Cancel/Refund error:", cancelRefundError);
                return NextResponse.json({ 
                    error: "返金/キャンセル処理中にエラーが発生しました。",
                    details: cancelRefundError instanceof Error ? cancelRefundError.message : 'Unknown error'
                }, { status: 500, headers: corsHeaders });
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

        if (cancelRefundResult) {
            updateData.stripePaymentAction = cancelRefundResult.action;
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

        const message = cancelRefundResult 
            ? `強制キャンセルと${cancelRefundResult.action === 'refunded' ? '返金' : 'オーソリキャンセル'}処理が完了しました。` 
            : "強制キャンセルが完了しました。";

        return NextResponse.json({ 
            success: true, 
            message,
            paymentAction: cancelRefundResult?.action || null,
        }, { headers: corsHeaders });

    } catch (error: unknown) {
        console.error("Error force cancelling:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        return NextResponse.json({ error: errorMessage }, { status: 500, headers: corsHeaders });
    }
}
