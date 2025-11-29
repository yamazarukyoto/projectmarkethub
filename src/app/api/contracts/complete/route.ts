import { NextRequest, NextResponse } from "next/server";
import { capturePaymentIntent, createTransfer } from "@/lib/stripe";
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
    const { contractId } = await req.json();
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
    if (contract?.clientId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 5. PaymentIntentID取得
    const paymentIntentId = contract?.stripePaymentIntentId;
    if (!paymentIntentId) {
      return NextResponse.json({ error: "PaymentIntent ID not found in contract" }, { status: 400 });
    }

    // 6. ワーカー情報取得 (Stripe Account ID)
    const workerRef = adminDb.collection("users").doc(contract?.workerId);
    const workerDoc = await workerRef.get();
    if (!workerDoc.exists) {
      return NextResponse.json({ error: "Worker not found" }, { status: 404 });
    }
    const worker = workerDoc.data();
    const workerStripeAccountId = worker?.stripeAccountId;

    if (!workerStripeAccountId) {
      return NextResponse.json({ error: "Worker Stripe Account ID not found" }, { status: 400 });
    }

    // 7. 金額計算
    const amount = contract?.amount || 0; // 税抜契約金額
    const tax = Math.floor(amount * 0.10);
    const totalAmount = amount + tax; // クライアント支払総額 (仮払い額)
    
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
      return NextResponse.json({ error: "Failed to capture payment" }, { status: 500 });
    }

    // 9. Transfer (送金)
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

    return NextResponse.json({ success: true, paymentIntent, transfer });

  } catch (error: any) {
    console.error("Error completing contract:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
