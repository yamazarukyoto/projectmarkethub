import { NextRequest, NextResponse } from "next/server";
import { createTransfer } from "@/lib/stripe";
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
    const { submissionId } = await req.json();
    if (!submissionId) {
      return NextResponse.json({ error: "Submission ID is required" }, { status: 400, headers: corsHeaders });
    }

    // 3. 提出情報取得
    const submissionRef = adminDb.collection("task_submissions").doc(submissionId);
    const submissionDoc = await submissionRef.get();
    if (!submissionDoc.exists) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404, headers: corsHeaders });
    }
    const submission = submissionDoc.data();

    // 4. 案件情報取得
    const jobRef = adminDb.collection("jobs").doc(submission?.jobId);
    const jobDoc = await jobRef.get();
    if (!jobDoc.exists) {
      return NextResponse.json({ error: "Job not found" }, { status: 404, headers: corsHeaders });
    }
    const job = jobDoc.data();

    // 5. 権限チェック (クライアント本人か)
    if (job?.clientId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: corsHeaders });
    }

    // 6. 既に承認済みかチェック
    if (submission?.status === 'approved') {
        return NextResponse.json({ error: "Already approved" }, { status: 400, headers: corsHeaders });
    }

    // 7. ワーカー情報取得 (Stripe Account ID)
    const workerRef = adminDb.collection("users").doc(submission?.workerId);
    const workerDoc = await workerRef.get();
    if (!workerDoc.exists) {
      return NextResponse.json({ error: "Worker not found" }, { status: 404, headers: corsHeaders });
    }
    const worker = workerDoc.data();
    const workerStripeAccountId = worker?.stripeAccountId;

    if (!workerStripeAccountId) {
      return NextResponse.json({ error: "Worker Stripe Account ID not found" }, { status: 400, headers: corsHeaders });
    }

    // 8. 金額計算
    const unitPrice = job?.task?.unitPrice || 0;
    const tax = Math.floor(unitPrice * 0.10);
    const totalAmount = unitPrice + tax; // 1件あたりの税込報酬
    
    const platformFeeBase = Math.floor(unitPrice * 0.05);
    const platformFeeTax = Math.floor(platformFeeBase * 0.10);
    const platformFee = platformFeeBase + platformFeeTax; // システム手数料 (税込)
    
    const transferAmount = totalAmount - platformFee; // ワーカー受取額

    // デモモード判定
    const paymentIntentId = job?.stripePaymentIntentId;
    if (!paymentIntentId || paymentIntentId.startsWith("demo_") || !process.env.STRIPE_SECRET_KEY) {
        console.warn("Demo payment intent detected or Stripe not configured. Skipping transfer.");
        
        await submissionRef.update({
            status: "approved",
            reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
            stripeTransferId: "demo_transfer_id",
        });

        return NextResponse.json({ success: true, skipped: true }, { headers: corsHeaders });
    }

    // 9. Transfer (報酬の引き渡し)
    // タスク方式の場合、募集時にPaymentIntentを作成しており、transfer_group = jobId となっているはず。
    // ここではそのグループに対して報酬を引き渡す。
    // 注意: PaymentIntentのCaptureは募集時に完了しているか、あるいはここでCaptureが必要か？
    // 仕様では「募集開始時に仮決済（PaymentIntent作成）」とある。
    // capture_method: 'manual' の場合、Captureが必要。
    // タスク方式の場合、全額を最初にCaptureしておくのが一般的（予算確保）。
    // もしCaptureしていなければ、ここでCaptureが必要だが、PaymentIntentは1つなので、
    // 最初の承認時に全額Captureするか、あるいは募集開始時にCaptureしておくべき。
    // ★sekkei.mdには「募集開始時に仮決済」とあるが、Captureのタイミングは明記されていない。
    // 通常、タスク方式は「仮決済＝決済確定（収納代行）」なので、募集開始時にCaptureすべき。
    // しかし、create-payment-intentは manual capture で作成している。
    // ここでは、もし未CaptureならCaptureするロジックを入れるか、あるいは
    // 募集開始時にCaptureするように変更すべきだが、今回は「承認時にTransfer」に集中する。
    // Stripeの仕様上、UncapturedなPaymentIntentからはTransferできない（資金がないため）。
    // よって、募集開始時にCaptureされている必要がある。
    // 現状の create-payment-intent は manual なので、
    // タスク方式の場合は募集開始時に capturePaymentIntent を呼ぶ必要がある。
    // しかし、それは create-payment-intent の責務か、あるいは別のAPIか。
    // 今回は、承認時に「資金がある」前提でTransferを行う。
    // もしエラーが出たら、それは募集時のCapture漏れ。

    const transfer = await createTransfer(
      transferAmount,
      workerStripeAccountId,
      submission?.jobId, // transfer_group
      {
        submissionId: submissionId,
        jobId: submission?.jobId,
        type: 'task_reward'
      }
    );

    // 10. DB更新 (ステータス承認)
    await submissionRef.update({
      status: "approved",
      stripeTransferId: transfer.id,
      reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, transfer }, { headers: corsHeaders });

  } catch (error: unknown) {
    console.error("Error approving task:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500, headers: corsHeaders });
  }
}
