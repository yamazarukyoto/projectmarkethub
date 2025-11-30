import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
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

    // デモモード判定 (PaymentIntentIDがデモ用の場合、またはStripeキーがない場合)
    if (paymentIntentId.startsWith("demo_") || !process.env.STRIPE_SECRET_KEY) {
        console.warn("Demo payment intent detected or Stripe not configured. Skipping capture.");
        
        await contractRef.update({
            status: "completed",
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return NextResponse.json({ success: true, skipped: true });
    }

    // 6. PaymentIntent Capture (決済確定)
    const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId);

    if (paymentIntent.status !== "succeeded") {
      return NextResponse.json({ error: "Failed to capture payment" }, { status: 500 });
    }

    // 7. DB更新 (ステータス完了)
    await contractRef.update({
      status: "completed",
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 8. Jobステータス更新 (もし必要なら)
    // 今回はContractのステータス更新のみとする

    return NextResponse.json({ success: true, paymentIntent });

  } catch (error: unknown) {
    console.error("Error capturing payment intent:", error);
    
    // エラー時もデモとして通す場合のフォールバック
    // 注意: req.json() は一度しか読めないため、tryブロック内で取得した contractId を使用するべきだが、
    // ここではスコープ外のため、本来は変数を外に出すべき。
    // しかし、既存コードのロジックを尊重しつつ、安全に修正する。
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
