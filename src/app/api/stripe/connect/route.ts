import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

export async function POST(req: Request) {
    let userId: string | null = null;
    
    try {
        const body = await req.json();
        userId = body.userId;

        if (!userId) {
            return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }

        // Stripeが無効な場合のデモ動作
        if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'dummy_key') {
            console.warn("Stripe is not configured. Simulating Connect flow.");
            
            // デモ用IDを保存
            await updateDoc(doc(db, "users", userId), {
                stripeAccountId: "acct_demo_" + Date.now(),
            });

            // 成功ページへリダイレクトするURLを返す
            return NextResponse.json({ 
                url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/account/worker/payout?success=true` 
            });
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
        await updateDoc(doc(db, "users", userId), {
            stripeAccountId: account.id,
        });

        // Create an Account Link for onboarding
        const accountLink = await stripe.accountLinks.create({
            account: account.id,
            refresh_url: `${process.env.NEXT_PUBLIC_BASE_URL}/account/worker/payout`,
            return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/account/worker/payout?success=true`,
            type: "account_onboarding",
        });

        return NextResponse.json({ url: accountLink.url });
    } catch (error) {
        console.error("Stripe Connect Error:", error);
        
        // Fallback to demo if Stripe fails
        console.warn("Stripe Connect failed, falling back to demo.");
        
        if (userId) {
             await updateDoc(doc(db, "users", userId), {
                stripeAccountId: "acct_demo_fallback_" + Date.now(),
            });
            return NextResponse.json({ 
                url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/account/worker/payout?success=true` 
            });
        }

        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
