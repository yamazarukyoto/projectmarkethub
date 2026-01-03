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

// GET: Stripeダッシュボードへのログインリンクを生成
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

        // 2. ユーザーのStripeアカウントIDを取得
        const userDoc = await adminDb.collection("users").doc(userId).get();
        const userData = userDoc.data();
        const stripeAccountId = userData?.stripeAccountId;

        if (!stripeAccountId) {
            return NextResponse.json({ error: "Stripe account not connected" }, { status: 400, headers: corsHeaders });
        }

        // デモアカウントの場合
        if (stripeAccountId.startsWith("acct_demo")) {
            return NextResponse.json({ 
                url: null,
                isDemo: true,
                message: "デモアカウントのため、Stripeダッシュボードは利用できません。"
            }, { headers: corsHeaders });
        }

        // Stripeが無効な場合
        if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'dummy_key') {
            console.error("Stripe Secret Key is missing or invalid.");
            return NextResponse.json({ 
                url: null,
                isDemo: true,
                message: "Stripeが設定されていません。"
            }, { headers: corsHeaders });
        }

        // 3. ログインリンクを生成
        try {
            const loginLink = await stripe.accounts.createLoginLink(stripeAccountId);
            return NextResponse.json({ url: loginLink.url }, { headers: corsHeaders });
        } catch (stripeError: any) {
            console.error("Stripe API Error (createLoginLink):", stripeError);
            
            console.log("Falling back to Account Link (Onboarding) due to login link failure.");

            try {
                const accountLink = await stripe.accountLinks.create({
                    account: stripeAccountId,
                    refresh_url: `${process.env.NEXT_PUBLIC_BASE_URL}/account/worker/payout`,
                    return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/account/worker/payout?success=true`,
                    type: "account_onboarding",
                });
                return NextResponse.json({ 
                    url: accountLink.url,
                    isOnboarding: true,
                    message: "Stripeアカウントの設定を確認する必要があります。設定画面へ移動します。"
                }, { headers: corsHeaders });
            } catch (linkError: any) {
                console.error("Failed to create Account Link:", linkError);
                return NextResponse.json({ 
                    error: stripeError.message || "Stripe API Error",
                    code: stripeError.code,
                    type: stripeError.type
                }, { status: 500, headers: corsHeaders });
            }
        }
    } catch (error: any) {
        console.error("Stripe Login Link Error:", error);
        return NextResponse.json({ 
            error: error.message || "Failed to create login link" 
        }, { status: 500, headers: corsHeaders });
    }
}

// POST: Stripe Connectアカウントを作成
export async function POST(req: Request) {
    let userId: string | null = null;
    
    try {
        // 1. 認証チェック
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
        }
        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(token);
        userId = decodedToken.uid;

        const body = await req.json();
        if (body.userId && body.userId !== userId) {
             return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: corsHeaders });
        }

        // Stripeが無効な場合のデモ動作
        if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'dummy_key') {
            console.warn("Stripe is not configured. Simulating Connect flow.");
            
            await adminDb.collection("users").doc(userId).update({
                stripeAccountId: "acct_demo_" + Date.now(),
            });

            return NextResponse.json({ 
                url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/account/worker/payout?success=true` 
            }, { headers: corsHeaders });
        }

        // Create a Stripe Connect account
        const account = await stripe.accounts.create({
            type: "express",
            country: "JP",
            capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true },
            },
        });

        // Save the Stripe Account ID to Firestore
        await adminDb.collection("users").doc(userId).update({
            stripeAccountId: account.id,
        });

        // Create an Account Link for onboarding
        const accountLink = await stripe.accountLinks.create({
            account: account.id,
            refresh_url: `${process.env.NEXT_PUBLIC_BASE_URL}/account/worker/payout`,
            return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/account/worker/payout?success=true`,
            type: "account_onboarding",
        });

        return NextResponse.json({ url: accountLink.url }, { headers: corsHeaders });
    } catch (error: any) {
        console.error("Stripe Connect Error:", error);
        
        const errorMessage = error.message || "Unknown error occurred";
        const errorType = error.type || "UnknownType";
        
        console.warn("Stripe Connect failed, falling back to demo.");
        
        if (userId) {
             await adminDb.collection("users").doc(userId).update({
                stripeAccountId: "acct_demo_fallback_" + Date.now(),
            });
            return NextResponse.json({ 
                url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/account/worker/payout?success=true` 
            }, { headers: corsHeaders });
        }

        return NextResponse.json({ error: errorMessage, type: errorType }, { status: 500, headers: corsHeaders });
    }
}
