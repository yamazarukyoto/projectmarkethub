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

export async function POST(req: NextRequest) {
    try {
        // 1. 認証チェック
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
        }
        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(token);
        const userId = decodedToken.uid;

        // 2. リクエストボディ取得
        const { contractId } = await req.json();
        if (!contractId) {
            return NextResponse.json({ error: "Contract ID is required" }, { status: 400, headers: corsHeaders });
        }

        // 3. 契約情報取得
        const contractRef = adminDb.collection("contracts").doc(contractId);
        const contractDoc = await contractRef.get();
        if (!contractDoc.exists) {
            return NextResponse.json({ error: "Contract not found" }, { status: 404, headers: corsHeaders });
        }
        const contract = contractDoc.data();

        // 4. 権限チェック（クライアントまたはワーカー本人のみ）
        if (contract?.clientId !== userId && contract?.workerId !== userId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: corsHeaders });
        }

        // 5. キャンセル申請が存在するかチェック
        if (!contract?.cancelRequestedBy) {
            return NextResponse.json({ 
                error: "キャンセル申請がありません。" 
            }, { status: 400, headers: corsHeaders });
        }

        // 6. 自分が申請者でないことを確認（自分で承認はできない）
        if (contract.cancelRequestedBy === userId) {
            return NextResponse.json({ 
                error: "自分のキャンセル申請を自分で承認することはできません。" 
            }, { status: 400, headers: corsHeaders });
        }

        // 7. ステータスチェック（キャンセル可能なステータスか）
        // submitted（納品確認待ち）も双方合意があればキャンセル可能
        const cancellableStatuses = ['pending_signature', 'waiting_for_escrow', 'escrow', 'in_progress', 'submitted'];
        if (!cancellableStatuses.includes(contract?.status)) {
            return NextResponse.json({ 
                error: `このステータス（${contract?.status}）ではキャンセルできません。検収完了後のキャンセルは運営にお問い合わせください。` 
            }, { status: 400, headers: corsHeaders });
        }

        // 8. 仮決済済みの場合は返金処理（escrow, in_progress, submittedが対象）
        let cancelResult = null;
        if (contract?.status === 'escrow' || contract?.status === 'in_progress' || contract?.status === 'submitted') {
            const paymentIntentId = contract?.stripePaymentIntentId;
            if (paymentIntentId) {
                try {
                    // PaymentIntentの状態に応じてキャンセルまたは返金を実行
                    // requires_capture（キャプチャ前）→ cancel
                    // succeeded（キャプチャ後）→ refund
                    cancelResult = await cancelOrRefundPaymentIntent(
                        paymentIntentId,
                        {
                            contractId: contractId,
                            reason: 'mutual_agreement_cancellation'
                        }
                    );
                    
                    console.log(`[cancel-approve] PaymentIntent処理完了: action=${cancelResult.action}, id=${cancelResult.result.id}`);
                    
                    // 結果の検証
                    const resultStatus = cancelResult.result.status;
                    if (cancelResult.action === 'cancelled') {
                        // キャンセルの場合、statusは'canceled'であるべき
                        if (resultStatus !== 'canceled') {
                            console.error("Cancel failed:", cancelResult);
                            return NextResponse.json({ 
                                error: "決済キャンセル処理に失敗しました。運営にお問い合わせください。" 
                            }, { status: 500, headers: corsHeaders });
                        }
                    } else if (cancelResult.action === 'refunded') {
                        // 返金の場合、statusは'succeeded'または'pending'であるべき
                        if (resultStatus !== 'succeeded' && resultStatus !== 'pending') {
                            console.error("Refund failed:", cancelResult);
                            return NextResponse.json({ 
                                error: "返金処理に失敗しました。運営にお問い合わせください。" 
                            }, { status: 500, headers: corsHeaders });
                        }
                    }
                } catch (cancelError) {
                    console.error("Cancel/Refund error:", cancelError);
                    return NextResponse.json({ 
                        error: "返金処理中にエラーが発生しました。運営にお問い合わせください。" 
                    }, { status: 500, headers: corsHeaders });
                }
            }
        }

        // 9. 契約をキャンセル状態に更新
        const updateData: Record<string, unknown> = {
            status: 'cancelled',
            cancelApprovedBy: userId,
            cancelApprovedAt: FieldValue.serverTimestamp(),
            cancelledAt: FieldValue.serverTimestamp(),
        };

        if (cancelResult) {
            // キャンセルの場合はPaymentIntentのID、返金の場合はRefundのIDを保存
            if (cancelResult.action === 'refunded') {
                updateData.stripeRefundId = cancelResult.result.id;
            } else {
                updateData.stripeCancelledPaymentIntentId = cancelResult.result.id;
            }
            updateData.paymentAction = cancelResult.action;
        }

        await contractRef.update(updateData);

        // 10. 通知（将来的にはメール通知も追加）
        // TODO: 通知機能が実装されたら追加

        const message = cancelResult 
            ? "キャンセルが成立しました。返金処理が開始されました。" 
            : "キャンセルが成立しました。";

        return NextResponse.json({ 
            success: true, 
            message,
            refunded: !!cancelResult
        }, { headers: corsHeaders });

    } catch (error: unknown) {
        console.error("Error approving cancel:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        return NextResponse.json({ error: errorMessage }, { status: 500, headers: corsHeaders });
    }
}
