import { NextRequest, NextResponse } from "next/server";
import { capturePaymentIntent, createTransfer } from "@/lib/stripe";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";

// CORSヘッダー
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// OPTIONSリクエスト（プリフライト）対応
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

    // 4. 権限チェック (クライアント本人か)
    if (contract?.clientId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: corsHeaders });
    }

    // 5. PaymentIntentID取得
    const paymentIntentId = contract?.stripePaymentIntentId;
    if (!paymentIntentId) {
      return NextResponse.json({ error: "PaymentIntent ID not found in contract" }, { status: 400, headers: corsHeaders });
    }

    // デモモード判定
    if (paymentIntentId.startsWith("demo_") || !process.env.STRIPE_SECRET_KEY) {
        console.warn("Demo payment intent detected or Stripe not configured. Skipping capture and transfer.");
        
        await contractRef.update({
            status: "completed",
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
            stripeTransferId: "demo_transfer_id",
        });

        return NextResponse.json({ success: true, skipped: true }, { headers: corsHeaders });
    }

    // 6. ワーカー情報取得 (Stripe Account ID)
    const workerRef = adminDb.collection("users").doc(contract?.workerId);
    const workerDoc = await workerRef.get();
    if (!workerDoc.exists) {
      return NextResponse.json({ error: "Worker not found" }, { status: 404, headers: corsHeaders });
    }
    const worker = workerDoc.data();
    const workerStripeAccountId = worker?.stripeAccountId;

    if (!workerStripeAccountId) {
      return NextResponse.json({ error: "Worker Stripe Account ID not found" }, { status: 400, headers: corsHeaders });
    }

    // 7. 金額計算
    const amount = contract?.amount || 0; // 税抜契約金額
    const tax = Math.floor(amount * 0.10);
    const totalAmount = amount + tax; // クライアント支払総額 (仮決済額)
    
    const platformFeeBase = Math.floor(amount * 0.05);
    const platformFeeTax = Math.floor(platformFeeBase * 0.10);
    const platformFee = platformFeeBase + platformFeeTax; // システム手数料 (税込)
    
    const transferAmount = totalAmount - platformFee; // ワーカー受取額

    // 8. PaymentIntent Capture (決済確定)
    // 既にCapture済みの場合はエラーになる可能性があるため、ステータスチェックを入れるのが理想だが、
    // ここではStripe側の冪等性に任せるか、エラーハンドリングで対応。
    // capturePaymentIntent関数はamountを指定しなければ全額キャプチャする。
    const paymentIntent = await capturePaymentIntent(paymentIntentId);

    if (paymentIntent.status !== "succeeded") {
      return NextResponse.json({ error: "Failed to capture payment" }, { status: 500, headers: corsHeaders });
    }

    // 9. Transfer (報酬の引き渡し)
    const transfer = await createTransfer(
      transferAmount,
      workerStripeAccountId,
      contract?.jobId, // transfer_group
      {
        contractId: contractId,
        jobId: contract?.jobId,
        type: 'reward'
      }
    );

    // 10. DB更新 (ステータス完了)
    await contractRef.update({
      status: "completed",
      stripeTransferId: transfer.id,
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, paymentIntent, transfer }, { headers: corsHeaders });

  } catch (error: unknown) {
    console.error("Error completing contract:", error);
    
    // エラーメッセージの取得
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json({ error: errorMessage }, { status: 500, headers: corsHeaders });
  }
}
