import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

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

export async function GET(req: Request) {
    try {
        // 1. 認証チェック
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
        }
        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(token);
        const userId = decodedToken.uid;

        // 2. ユーザー情報取得
        const userDoc = await adminDb.collection("users").doc(userId).get();
        const userData = userDoc.data();
        const stripeAccountId = userData?.stripeAccountId;

        if (!stripeAccountId) {
            return NextResponse.json({ 
                connected: false,
                status: "unconnected"
            }, { headers: corsHeaders });
        }

        // デモアカウントの場合は「未連携」として扱う
        // （開発時のフォールバックで作成されたダミーアカウント）
        if (stripeAccountId.startsWith("acct_demo")) {
            console.warn(`User ${userId} has demo Stripe account: ${stripeAccountId}. Treating as unconnected.`);
            return NextResponse.json({ 
                connected: false,
                status: "unconnected",
                isDemo: true,
                message: "デモアカウントが設定されています。正しくStripe連携を行ってください。"
            }, { headers: corsHeaders });
        }

        // Stripeが無効な場合
        if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'dummy_key') {
            return NextResponse.json({ 
                connected: true,
                accountId: stripeAccountId,
                payoutsEnabled: true,
                chargesEnabled: true,
                detailsSubmitted: true,
                status: "active",
                isDemo: true
            }, { headers: corsHeaders });
        }

        // 3. Stripeアカウント詳細取得
        try {
            const account = await stripe.accounts.retrieve(stripeAccountId);
            
            // ステータス判定
            let status = "pending";
            if (account.payouts_enabled && account.charges_enabled) {
                status = "active";
            } else if (account.requirements?.currently_due && account.requirements.currently_due.length > 0) {
                status = "restricted";
            } else if (!account.details_submitted) {
                status = "incomplete";
            }

            return NextResponse.json({
                connected: true,
                accountId: account.id,
                payoutsEnabled: account.payouts_enabled,
                chargesEnabled: account.charges_enabled,
                detailsSubmitted: account.details_submitted,
                requirements: account.requirements,
                status: status
            }, { headers: corsHeaders });

        } catch (stripeError: any) {
            console.error("Stripe API Error:", stripeError);
            return NextResponse.json({ 
                error: "Failed to retrieve Stripe account details",
                details: stripeError.message
            }, { status: 500, headers: corsHeaders });
        }

    } catch (error: any) {
        console.error("Account Status API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
    }
}
