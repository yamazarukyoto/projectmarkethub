import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { adminAuth } from "@/lib/firebase-admin";

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
  console.log("[create-payment-intent] API called");
  const startTime = Date.now();
  
  try {
    // 1. 認証チェック
    console.log("[create-payment-intent] Step 1: Auth check");
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }
    const token = authHeader.split("Bearer ")[1];
    console.log("[create-payment-intent] Step 1.1: Verifying token...");
    const decodedToken = await adminAuth.verifyIdToken(token);
    console.log(`[create-payment-intent] Step 1.2: Token verified in ${Date.now() - startTime}ms`);
    const userId = decodedToken.uid;

    // 2. リクエストボディ取得（クライアントから必要な情報を受け取る）
    const { 
      contractId, 
      jobId, 
      amount,
      workerId,
      workerStripeAccountId,
      existingPaymentIntentId 
    } = await req.json();
    
    if (!contractId && !jobId) {
      return NextResponse.json({ error: "Contract ID or Job ID is required" }, { status: 400, headers: corsHeaders });
    }

    if (!amount || amount < 50) {
      return NextResponse.json({ 
        error: "決済金額が少なすぎます。50円以上の金額を設定してください。" 
      }, { status: 400, headers: corsHeaders });
    }

    // Stripeが無効な場合のデモ動作
    const isStripeConfigured = process.env.STRIPE_SECRET_KEY && 
                               process.env.STRIPE_SECRET_KEY !== 'dummy_key';
    
    if (!isStripeConfigured) {
      console.warn("Stripe is not configured. Skipping payment for demo.");
      return NextResponse.json({ skipped: true, demoMode: true }, { headers: corsHeaders });
    }

    // 既存のPaymentIntentを確認して再利用またはステータス反映
    if (existingPaymentIntentId && existingPaymentIntentId !== "demo_payment_intent_id") {
      try {
        console.log(`[create-payment-intent] Checking existing PaymentIntent: ${existingPaymentIntentId}`);
        const existingPi = await stripe.paymentIntents.retrieve(existingPaymentIntentId);
        
        // 既に仮払い成功している場合
        if (existingPi.status === 'requires_capture' || existingPi.status === 'succeeded') {
          console.log(`[create-payment-intent] Payment already authorized: ${existingPi.status}`);
          return NextResponse.json({ 
            skipped: true, 
            alreadyAuthorized: true,
            message: "Payment already authorized" 
          }, { headers: corsHeaders });
        }

        // まだ有効な進行中ステータスの場合、再利用する
        if (['requires_payment_method', 'requires_confirmation', 'requires_action'].includes(existingPi.status)) {
          // 金額が一致する場合のみ再利用
          if (existingPi.amount === amount) {
            console.log(`[create-payment-intent] Reusing existing PaymentIntent`);
            return NextResponse.json({ clientSecret: existingPi.client_secret }, { headers: corsHeaders });
          }
        }
        
        // canceled などの場合は新規作成へ進む
        console.log(`[create-payment-intent] Existing PaymentIntent status: ${existingPi.status}, creating new one`);
      } catch (e) {
        console.warn("Failed to retrieve existing payment intent:", e);
        // エラー時は無視して新規作成へ
      }
    }

    // メタデータ作成
    const metadata: Record<string, string> = { 
      clientId: userId, 
      type: "escrow" 
    };
    
    if (contractId) {
      metadata.contractId = contractId;
      if (workerId) metadata.workerId = workerId;
    } else if (jobId) {
      metadata.jobId = jobId;
    }

    // PaymentIntent作成 (新規)
    console.log(`[create-payment-intent] Creating new PaymentIntent for amount: ${amount}`);
    const paymentIntentParams: import("stripe").Stripe.PaymentIntentCreateParams = {
      amount: amount,
      currency: "jpy",
      capture_method: "manual", // 仮決済
      metadata: metadata,
      payment_method_types: ['card'], // カード決済のみを許可
      description: contractId ? `Contract: ${contractId}` : `Job: ${jobId}`,
    };

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);
    console.log(`[create-payment-intent] PaymentIntent created: ${paymentIntent.id} in ${Date.now() - startTime}ms`);

    return NextResponse.json({ 
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    }, { headers: corsHeaders });

  } catch (error: unknown) {
    console.error("Error creating payment intent:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500, headers: corsHeaders });
  }
}
