import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";

export async function POST(req: NextRequest) {
  console.log("[create-payment-intent] API called");
  const startTime = Date.now();
  
  try {
    // 1. 認証チェック
    console.log("[create-payment-intent] Step 1: Auth check");
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.split("Bearer ")[1];
    console.log("[create-payment-intent] Step 1.1: Verifying token...");
    const decodedToken = await adminAuth.verifyIdToken(token);
    console.log(`[create-payment-intent] Step 1.2: Token verified in ${Date.now() - startTime}ms`);
    const userId = decodedToken.uid;

    // 2. リクエストボディ取得
    const { contractId, jobId, amount: reqAmount } = await req.json();
    
    if (!contractId && !jobId) {
      return NextResponse.json({ error: "Contract ID or Job ID is required" }, { status: 400 });
    }

    let amount = 0;
    let platformFee = 0;
    let workerStripeAccountId = null;
    const metadata: Record<string, string> = { clientId: userId, type: "escrow" };
    let targetRef = null;
    let existingPaymentIntentId = null;

    if (contractId) {
        // --- プロジェクト方式（契約後の仮決済） ---
        console.log(`[create-payment-intent] Step 2: Fetching contract ${contractId}...`);
        const contractDoc = await adminDb.collection("contracts").doc(contractId).get();
        console.log(`[create-payment-intent] Step 2.1: Contract fetched in ${Date.now() - startTime}ms`);
        if (!contractDoc.exists) {
            return NextResponse.json({ error: "Contract not found" }, { status: 404 });
        }
        const contract = contractDoc.data();
        if (contract?.clientId !== userId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const workerDoc = await adminDb.collection("users").doc(contract?.workerId).get();
        workerStripeAccountId = workerDoc.data()?.stripeAccountId;
        
        amount = Math.round(contract?.totalAmount);
        platformFee = Math.floor(contract?.amount * 0.05);
        metadata.contractId = contractId;
        metadata.workerId = contract?.workerId;
        targetRef = adminDb.collection("contracts").doc(contractId);
        existingPaymentIntentId = contract?.stripePaymentIntentId;

    } else if (jobId) {
        // --- コンペ・タスク方式（募集時の仮決済） ---
        const jobDoc = await adminDb.collection("jobs").doc(jobId).get();
        if (!jobDoc.exists) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }
        const job = jobDoc.data();
        if (job?.clientId !== userId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        amount = job?.budget || reqAmount; 
        metadata.jobId = jobId;
        targetRef = adminDb.collection("jobs").doc(jobId);
        existingPaymentIntentId = job?.stripePaymentIntentId;
    }

    // Stripeが無効な場合のデモ動作
    const isStripeConfigured = process.env.STRIPE_SECRET_KEY && 
                               process.env.STRIPE_SECRET_KEY !== 'dummy_key';
    
    if (!isStripeConfigured) {
      console.warn("Stripe is not configured. Skipping payment for demo.");
      
      if (contractId) {
          await targetRef?.update({
            status: "escrow",
            escrowAt: admin.firestore.FieldValue.serverTimestamp(),
            stripePaymentIntentId: "demo_payment_intent_id",
          });
      } else if (jobId) {
          await targetRef?.update({
            status: "open",
            stripePaymentIntentId: "demo_payment_intent_id",
          });
      }

      return NextResponse.json({ skipped: true });
    }

    // 金額チェック
    if (amount < 50) {
        return NextResponse.json({ 
            error: "決済金額が少なすぎます。50円以上の金額を設定してください。" 
        }, { status: 400 });
    }

    // 既存のPaymentIntentを確認して再利用またはステータス反映
    if (existingPaymentIntentId && existingPaymentIntentId !== "demo_payment_intent_id") {
        try {
            const existingPi = await stripe.paymentIntents.retrieve(existingPaymentIntentId);
            
            // 既に仮払い成功している場合
            if (existingPi.status === 'requires_capture' || existingPi.status === 'succeeded') {
                // DBステータスを更新して完了扱いにする
                if (contractId) {
                    await targetRef?.update({
                        status: "escrow",
                        escrowAt: admin.firestore.FieldValue.serverTimestamp(),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                } else if (jobId) {
                    await targetRef?.update({
                        status: "open",
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                }
                // フロントエンドにはスキップ（完了）として通知
                return NextResponse.json({ skipped: true, message: "Payment already authorized" });
            }

            // まだ有効な進行中ステータスの場合、再利用する
            if (['requires_payment_method', 'requires_confirmation', 'requires_action'].includes(existingPi.status)) {
                // 金額が一致する場合のみ再利用
                if (existingPi.amount === amount) {
                     return NextResponse.json({ clientSecret: existingPi.client_secret });
                }
            }
            
            // canceled などの場合は新規作成へ進む
        } catch (e) {
            console.warn("Failed to retrieve existing payment intent:", e);
            // エラー時は無視して新規作成へ
        }
    }

    // 6. PaymentIntent作成 (新規)
    const paymentIntentParams: import("stripe").Stripe.PaymentIntentCreateParams = {
      amount: amount,
      currency: "jpy",
      capture_method: "manual", // 仮決済
      metadata: metadata,
      payment_method_types: ['card'], // カード決済のみを許可
      description: contractId ? `Contract: ${contractId}` : `Job: ${jobId}`,
    };

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

    // 7. DB更新 (PaymentIntentID保存)
    await targetRef?.update({
      stripePaymentIntentId: paymentIntent.id,
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });

  } catch (error: unknown) {
    console.error("Error creating payment intent:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
