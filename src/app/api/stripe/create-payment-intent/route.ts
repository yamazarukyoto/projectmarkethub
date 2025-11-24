import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

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
    const contractDoc = await adminDb.collection("contracts").doc(contractId).get();
    if (!contractDoc.exists) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }
    const contract = contractDoc.data();

    // 4. 権限チェック (クライアント本人か)
    if (contract?.clientId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 5. ワーカーのStripeアカウントID取得
    const workerDoc = await adminDb.collection("users").doc(contract?.workerId).get();
    const workerStripeAccountId = workerDoc.data()?.stripeAccountId;

    if (!workerStripeAccountId) {
      return NextResponse.json({ error: "Worker has not connected Stripe account" }, { status: 400 });
    }

    // 6. PaymentIntent作成 (仮払い)
    // 手数料計算 (5%)
    const amount = contract?.totalAmount; // 税込金額
    const platformFee = Math.floor(contract?.amount * 0.05); // 税抜金額の5%

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: "jpy",
      capture_method: "manual", // 仮払い (オーソリのみ)
      transfer_data: {
        destination: workerStripeAccountId,
      },
      application_fee_amount: platformFee,
      metadata: {
        contractId: contractId,
        clientId: userId,
        workerId: contract?.workerId,
        type: "escrow",
      },
    });

    // 7. DB更新 (PaymentIntentID保存)
    await adminDb.collection("contracts").doc(contractId).update({
      stripePaymentIntentId: paymentIntent.id,
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });

  } catch (error: any) {
    console.error("Error creating payment intent:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
