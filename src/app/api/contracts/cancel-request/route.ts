import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, FieldValue } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
    try {
        // 1. 認証チェック
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(token);
        const userId = decodedToken.uid;

        // 2. リクエストボディ取得
        const { contractId, reason } = await req.json();
        if (!contractId) {
            return NextResponse.json({ error: "Contract ID is required" }, { status: 400 });
        }

        // 3. 契約情報取得
        const contractRef = adminDb.collection("contracts").doc(contractId);
        const contractDoc = await contractRef.get();
        if (!contractDoc.exists) {
            return NextResponse.json({ error: "Contract not found" }, { status: 404 });
        }
        const contract = contractDoc.data();

        // 4. 権限チェック（クライアントまたはワーカー本人のみ）
        if (contract?.clientId !== userId && contract?.workerId !== userId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // 5. ステータスチェック（キャンセル可能なステータスか）
        // submitted（納品確認待ち）も双方合意があればキャンセル可能
        const cancellableStatuses = ['pending_signature', 'waiting_for_escrow', 'escrow', 'in_progress', 'submitted'];
        if (!cancellableStatuses.includes(contract?.status)) {
            return NextResponse.json({ 
                error: `このステータス（${contract?.status}）ではキャンセルできません。検収完了後のキャンセルは運営にお問い合わせください。` 
            }, { status: 400 });
        }

        // 6. 既にキャンセル申請中かチェック
        if (contract?.cancelRequestedBy) {
            // 既に申請済みの場合
            if (contract.cancelRequestedBy === userId) {
                return NextResponse.json({ 
                    error: "既にキャンセルを申請済みです。相手方の承認をお待ちください。" 
                }, { status: 400 });
            } else {
                // 相手が申請済みの場合は、承認APIを使うよう案内
                return NextResponse.json({ 
                    error: "相手方からキャンセル申請が届いています。承認する場合は「キャンセルに同意」ボタンを押してください。" 
                }, { status: 400 });
            }
        }

        // 7. キャンセル申請を記録
        await contractRef.update({
            cancelRequestedBy: userId,
            cancelRequestedAt: FieldValue.serverTimestamp(),
            cancelReason: reason || '',
        });

        // 8. 相手方への通知（将来的にはメール通知も追加）
        // TODO: 通知機能が実装されたら追加

        return NextResponse.json({ 
            success: true, 
            message: "キャンセル申請を送信しました。相手方の承認をお待ちください。" 
        });

    } catch (error: unknown) {
        console.error("Error requesting cancel:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
