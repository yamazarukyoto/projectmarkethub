import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";

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
    const { jobId, contractId, newPaymentIntentId } = await req.json();

    if (!jobId && !contractId) {
      return NextResponse.json({ error: "Job ID or Contract ID is required" }, { status: 400, headers: corsHeaders });
    }

    let targetRef;
    let currentData;
    let paymentIntentId;

    if (jobId) {
        targetRef = adminDb.collection("jobs").doc(jobId);
        const docSnap = await targetRef.get();
        if (!docSnap.exists) return NextResponse.json({ error: "Job not found" }, { status: 404, headers: corsHeaders });
        currentData = docSnap.data();
        if (currentData?.clientId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: corsHeaders });
        // 新しいPaymentIntentIDが渡された場合はそれを使用（再仮払い対応）
        paymentIntentId = newPaymentIntentId || currentData?.stripePaymentIntentId;
    } else {
        targetRef = adminDb.collection("contracts").doc(contractId);
        const docSnap = await targetRef.get();
        if (!docSnap.exists) return NextResponse.json({ error: "Contract not found" }, { status: 404, headers: corsHeaders });
        currentData = docSnap.data();
        if (currentData?.clientId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: corsHeaders });
        // 新しいPaymentIntentIDが渡された場合はそれを使用（再仮払い対応）
        paymentIntentId = newPaymentIntentId || currentData?.stripePaymentIntentId;
    }

    if (!paymentIntentId) {
        // デモモードまたはエラー
        if (currentData?.status === 'open' || currentData?.status === 'escrow') {
             return NextResponse.json({ success: true, status: currentData.status }, { headers: corsHeaders });
        }
        return NextResponse.json({ error: "Payment Intent ID not found" }, { status: 400, headers: corsHeaders });
    }

    // 3. Stripe PaymentIntent確認
    // デモ用のIDの場合はスキップ
    if (paymentIntentId === "demo_payment_intent_id") {
         return NextResponse.json({ success: true, status: currentData?.status }, { headers: corsHeaders });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === "requires_capture" || paymentIntent.status === "succeeded") {
        // 4. ステータス更新
        if (jobId) {
            const updateData: Record<string, unknown> = {
                status: "open",
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            };
            // 新しいPaymentIntentIDがある場合は更新
            if (newPaymentIntentId) {
                updateData.stripePaymentIntentId = newPaymentIntentId;
            }
            await targetRef.update(updateData);
        } else {
            const updateData: Record<string, unknown> = {
                status: "escrow",
                escrowAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            };
            // 新しいPaymentIntentIDがある場合は更新（再仮払い対応）
            if (newPaymentIntentId) {
                updateData.stripePaymentIntentId = newPaymentIntentId;
            }
            await targetRef.update(updateData);
        }
        return NextResponse.json({ success: true }, { headers: corsHeaders });
    } else {
        return NextResponse.json({ error: `Payment status is ${paymentIntent.status}` }, { status: 400, headers: corsHeaders });
    }

  } catch (error: unknown) {
    console.error("Error verifying payment:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500, headers: corsHeaders });
  }
}
