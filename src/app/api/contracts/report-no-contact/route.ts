import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, FieldValue } from "@/lib/firebase-admin";

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
        const { contractId, reason } = await req.json();
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

        // 4. 権限チェック（クライアント本人のみ）
        if (contract?.clientId !== userId) {
            return NextResponse.json({ error: "Forbidden - クライアントのみ連絡不通を報告できます" }, { status: 403, headers: corsHeaders });
        }

        // 5. ステータスチェック（業務中のみ報告可能）
        const reportableStatuses = ['escrow', 'in_progress'];
        if (!reportableStatuses.includes(contract?.status)) {
            return NextResponse.json({ 
                error: `このステータス（${contract?.status}）では連絡不通報告はできません。` 
            }, { status: 400, headers: corsHeaders });
        }

        // 6. 既に報告済みかチェック
        if (contract?.noContactReportedAt) {
            return NextResponse.json({ 
                error: "既に連絡不通を報告済みです。運営からの対応をお待ちください。" 
            }, { status: 400, headers: corsHeaders });
        }

        // 7. 連絡不通報告を記録
        await contractRef.update({
            noContactReportedAt: FieldValue.serverTimestamp(),
            noContactReportReason: reason || 'ワーカーからの連絡が途絶えています',
            status: 'disputed',
        });

        // 8. 管理者への通知（reportsコレクションに追加）
        await adminDb.collection("reports").add({
            type: 'no_contact',
            contractId: contractId,
            reporterId: userId,
            reportedUserId: contract?.workerId,
            reason: reason || 'ワーカーからの連絡が途絶えています',
            status: 'pending',
            createdAt: FieldValue.serverTimestamp(),
        });

        return NextResponse.json({ 
            success: true, 
            message: "連絡不通を報告しました。運営が確認の上、対応いたします。" 
        }, { headers: corsHeaders });

    } catch (error: unknown) {
        console.error("Error reporting no contact:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        return NextResponse.json({ error: errorMessage }, { status: 500, headers: corsHeaders });
    }
}
