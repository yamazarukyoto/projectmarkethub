import { NextRequest, NextResponse } from "next/server";
import { createRefund } from "@/lib/stripe";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";

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
    const { contractId, amount, reason } = await req.json();
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

    // 4. 権限チェック (クライアント本人か)
    // ※本来はワーカーの合意が必要なケースもあるが、ここではAPIレベルでの実行権限としてクライアントを許可
    if (contract?.clientId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 5. PaymentIntentID取得
    const paymentIntentId = contract?.stripePaymentIntentId;
    if (!paymentIntentId) {
      return NextResponse.json({ error: "PaymentIntent ID not found in contract" }, { status: 400 });
    }

    // 6. Refund実行
    const refund = await createRefund(
      paymentIntentId,
      amount, // 指定がなければ全額
      {
        contractId: contractId,
        reason: reason || 'requested_by_client'
      }
    );

    if (refund.status !== "succeeded" && refund.status !== "pending") {
        // pendingは非同期処理の場合あり
        return NextResponse.json({ error: "Failed to create refund" }, { status: 500 });
    }

    // 7. DB更新 (ステータスキャンセル)
    // 全額返金の場合はキャンセル扱い、部分返金の場合は状況によるが、ここではキャンセルとする
    await contractRef.update({
      status: "cancelled",
      stripeRefundId: refund.id,
      cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, refund });

  } catch (error: any) {
    console.error("Error creating refund:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
