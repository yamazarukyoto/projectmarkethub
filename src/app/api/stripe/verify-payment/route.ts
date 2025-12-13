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
    const { jobId, contractId } = await req.json();

    if (!jobId && !contractId) {
      return NextResponse.json({ error: "Job ID or Contract ID is required" }, { status: 400 });
    }

    let targetRef;
    let currentData;
    let paymentIntentId;

    if (jobId) {
        targetRef = adminDb.collection("jobs").doc(jobId);
        const docSnap = await targetRef.get();
        if (!docSnap.exists) return NextResponse.json({ error: "Job not found" }, { status: 404 });
        currentData = docSnap.data();
        if (currentData?.clientId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        paymentIntentId = currentData?.stripePaymentIntentId;
    } else {
        targetRef = adminDb.collection("contracts").doc(contractId);
        const docSnap = await targetRef.get();
        if (!docSnap.exists) return NextResponse.json({ error: "Contract not found" }, { status: 404 });
        currentData = docSnap.data();
        if (currentData?.clientId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        paymentIntentId = currentData?.stripePaymentIntentId;
    }

    if (!paymentIntentId) {
        // デモモードまたはエラー
        if (currentData?.status === 'open' || currentData?.status === 'escrow') {
             return NextResponse.json({ success: true, status: currentData.status });
        }
        return NextResponse.json({ error: "Payment Intent ID not found" }, { status: 400 });
    }

    // 3. Stripe PaymentIntent確認
    // デモ用のIDの場合はスキップ
    if (paymentIntentId === "demo_payment_intent_id") {
         return NextResponse.json({ success: true, status: currentData?.status });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === "requires_capture" || paymentIntent.status === "succeeded") {
        // 4. ステータス更新
        if (jobId) {
            await targetRef.update({
                status: "open",
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        } else {
            await targetRef.update({
                status: "escrow",
                escrowAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        return NextResponse.json({ success: true });
    } else {
        return NextResponse.json({ error: `Payment status is ${paymentIntent.status}` }, { status: 400 });
    }

  } catch (error: unknown) {
    console.error("Error verifying payment:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
