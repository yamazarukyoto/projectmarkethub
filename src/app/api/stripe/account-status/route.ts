import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function GET(req: Request) {
    try {
        // 1. 認証チェック
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
            });
        }

        // デモアカウントの場合
        if (stripeAccountId.startsWith("acct_demo")) {
            return NextResponse.json({ 
                connected: true,
                accountId: stripeAccountId,
                payoutsEnabled: true, // デモなので常にOKとする
                chargesEnabled: true,
                detailsSubmitted: true,
                status: "active",
                isDemo: true
            });
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
            });
        }

        // 3. Stripeアカウント詳細取得
        try {
            const account = await stripe.accounts.retrieve(stripeAccountId);
            
            // ステータス判定
            let status = "pending";
            if (account.payouts_enabled && account.charges_enabled) {
                status = "active";
            } else if (account.requirements?.currently_due && account.requirements.currently_due.length > 0) {
                status = "restricted"; // 情報不足
            } else if (!account.details_submitted) {
                status = "incomplete"; // 未入力
            }

            return NextResponse.json({
                connected: true,
                accountId: account.id,
                payoutsEnabled: account.payouts_enabled,
                chargesEnabled: account.charges_enabled,
                detailsSubmitted: account.details_submitted,
                requirements: account.requirements,
                status: status
            });

        } catch (stripeError: any) {
            console.error("Stripe API Error:", stripeError);
            return NextResponse.json({ 
                error: "Failed to retrieve Stripe account details",
                details: stripeError.message
            }, { status: 500 });
        }

    } catch (error: any) {
        console.error("Account Status API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
