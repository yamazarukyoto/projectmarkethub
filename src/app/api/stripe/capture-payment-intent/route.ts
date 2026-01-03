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
export async function OPTIONS(req: NextRequest) {
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
    if (paymentIntentId.startsWith("demo_") || !process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'dummy_key') {
        console.warn("Demo payment intent detected. Skipping capture.");
        await contractRef.update({
            status: "completed",
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return NextResponse.json({ success: true, skipped: true }, { headers: corsHeaders });
    }

    // 5.5. ワーカーのStripeアカウント状態チェック (事前チェック)
    // これにより、送金失敗が確定している状態でCaptureしてしまうのを防ぐ
    const workerId = contract?.workerId;
    if (!workerId) {
         return NextResponse.json({ error: "Worker ID not found in contract" }, { status: 400, headers: corsHeaders });
    }
    const workerDoc = await adminDb.collection("users").doc(workerId).get();
    const workerStripeAccountId = workerDoc.data()?.stripeAccountId;

    if (!workerStripeAccountId) {
        return NextResponse.json({ error: "ワーカーがStripe連携を行っていないため、検収できません。" }, { status: 400, headers: corsHeaders });
    }

    // アカウント状態確認
    try {
        const account = await stripe.accounts.retrieve(workerStripeAccountId);
        // payouts_enabled: 銀行口座への出金が可能か
        // charges_enabled: 決済が可能か（Connectの場合、送金受け取りにも関連する場合がある）
        // テスト環境では要件が緩い場合もあるが、基本的にはこれらがtrueである必要がある
        if (!account.payouts_enabled && !account.charges_enabled) {
             console.warn(`Worker account ${workerStripeAccountId} is not fully enabled. Payouts: ${account.payouts_enabled}, Charges: ${account.charges_enabled}`);
             // エラーとして返す
             return NextResponse.json({ 
                 error: "ワーカーのStripeアカウントが入金可能な状態ではありません（本人確認未完了など）。ワーカーにアカウント設定を確認するよう依頼してください。" 
             }, { status: 400, headers: corsHeaders });
        }
    } catch (e) {
        console.error("Failed to retrieve worker account:", e);
        return NextResponse.json({ error: "ワーカーのStripeアカウント情報の取得に失敗しました。" }, { status: 500, headers: corsHeaders });
    }

    // 6. PaymentIntent Capture (決済確定)
    const paymentIntentObj = await stripe.paymentIntents.retrieve(paymentIntentId);
    let paymentIntent;

    // レガシーデータ対応: transfer_data削除
    if (paymentIntentObj.transfer_data && paymentIntentObj.status === 'requires_capture') {
        try {
            await stripe.paymentIntents.update(paymentIntentId, {
                transfer_data: null,
                application_fee_amount: null,
                on_behalf_of: null,
            } as any);
        } catch (e) {
            console.warn("Failed to remove transfer_data.", e);
        }
    }

    try {
        if (paymentIntentObj.status === 'requires_capture') {
            paymentIntent = await stripe.paymentIntents.capture(paymentIntentId);
        } else if (paymentIntentObj.status === 'succeeded') {
            paymentIntent = paymentIntentObj;
        } else {
            return NextResponse.json({ error: `Invalid PaymentIntent status: ${paymentIntentObj.status}` }, { status: 400, headers: corsHeaders });
        }

        if (paymentIntent.status !== "succeeded") {
            return NextResponse.json({ error: "Failed to capture payment" }, { status: 500, headers: corsHeaders });
        }
    } catch (error: any) {
        console.error("Capture failed:", error);
        return NextResponse.json({ 
            error: "決済の確定に失敗しました。" + (error.message ? ` (${error.message})` : "")
        }, { status: 500, headers: corsHeaders });
    }

    // 7. Transfer to Worker (報酬の引き渡し)
    // ここで失敗した場合、Captureは成功しているがTransferは失敗している状態になる
    // 整合性を保つため、この場合はエラーを返し、ステータスを 'completed' にしない
    try {
        const transferAmount = contract?.workerReceiveAmount;
        if (!transferAmount) {
            throw new Error("Transfer amount is missing");
        }

        // 既にTransfer済みか確認
        if (contract.stripeTransferId) {
            console.log("Transfer already completed. Skipping.");
        } else {
            // source_transactionを指定して、資金が利用可能になり次第送金する
            // これにより、残高不足エラー（insufficient funds）を回避できる
            const transfer = await stripe.transfers.create({
                amount: transferAmount,
                currency: "jpy",
                destination: workerStripeAccountId,
                transfer_group: contract?.jobId,
                source_transaction: paymentIntent.latest_charge as string, // 必須: 資金源となるCharge IDを指定
                metadata: {
                    contractId: contractId,
                    jobId: contract?.jobId,
                    type: "reward"
                }
            });
            
            await contractRef.update({
                stripeTransferId: transfer.id
            });
            console.log(`Transfer created: ${transfer.id}`);
        }
    } catch (error: any) {
        console.error("Transfer failed:", error);
        
        // Capture成功・Transfer失敗の状態を記録
        await contractRef.update({
            status: "transfer_failed", // 専用ステータスまたは disputed
            transferError: error.message || "Unknown transfer error",
            paymentStatus: "capture_succeeded_transfer_failed",
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // クライアントにはエラーとして通知する（完了扱いしない）
        return NextResponse.json({ 
            error: "支払いは確定しましたが、ワーカーへの送金処理に失敗しました。システム管理者にお問い合わせください。",
            code: "transfer_failed",
            details: error.message
        }, { status: 500, headers: corsHeaders });
    }

    // 8. DB更新 (全て成功した場合のみ完了)
    await contractRef.update({
      status: "completed",
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      paymentStatus: "paid",
      transferError: admin.firestore.FieldValue.delete()
    });

    return NextResponse.json({ 
        success: true, 
        paymentIntentId: paymentIntent.id,
        paymentIntentStatus: paymentIntent.status
    }, { headers: corsHeaders });

  } catch (error: unknown) {
    console.error("Error capturing payment intent:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500, headers: corsHeaders });
  }
}
