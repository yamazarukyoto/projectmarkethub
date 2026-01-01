import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { headers } from "next/headers";
import { adminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";

export async function POST(req: Request) {
    const db = adminDb;
    const body = await req.text();
    const signature = (await headers()).get("Stripe-Signature") as string;

    let event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(`Webhook signature verification failed: ${errorMessage}`);
        return NextResponse.json({ error: "Webhook Error" }, { status: 400 });
    }

    try {
        switch (event.type) {
            case "identity.verification_session.verified": {
                const session = event.data.object as import("stripe").Stripe.Identity.VerificationSession;
                const userId = session.metadata?.userId;
                if (userId) {
                    await db.collection("users").doc(userId).update({
                        verificationStatus: "approved",
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                    console.log(`User ${userId} verification approved.`);
                }
                break;
            }
            case "identity.verification_session.requires_input": {
                const session = event.data.object as import("stripe").Stripe.Identity.VerificationSession;
                const userId = session.metadata?.userId;
                const lastError = session.last_error;
                if (userId) {
                    // lastError might not have message in types, but usually has reason or code
                    const reason = lastError?.reason || (lastError as any)?.message || "Verification failed. Please try again.";
                    await db.collection("users").doc(userId).update({
                        verificationStatus: "rejected",
                        verificationRejectionReason: reason,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                    console.log(`User ${userId} verification requires input/rejected.`);
                }
                break;
            }
            case "account.updated": {
                const account = event.data.object as import("stripe").Stripe.Account;
                // Connectアカウントの更新イベント
                // ユーザーIDを特定する必要があるが、accountオブジェクトにはmetadataが含まれていない場合がある
                // そのため、stripeAccountIdでユーザーを検索する
                const usersRef = db.collection("users");
                const snapshot = await usersRef.where("stripeAccountId", "==", account.id).limit(1).get();
                
                if (!snapshot.empty) {
                    const userDoc = snapshot.docs[0];
                    const userId = userDoc.id;
                    
                    // 本人確認状態の同期
                    // charges_enabled と payouts_enabled が true なら本人確認完了とみなす
                    if (account.charges_enabled && account.payouts_enabled) {
                        await userDoc.ref.update({
                            verificationStatus: "approved",
                            stripeOnboardingComplete: true,
                            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                        });
                        console.log(`User ${userId} verification approved via Connect Account update.`);
                    } else if (account.requirements?.currently_due && account.requirements.currently_due.length > 0) {
                        // 要件が残っている場合は pending または rejected
                        // ここでは厳密に rejected にせず、pending のままにするか、UI側で判定させる
                        // ただし、verificationStatus を更新することで、Identity機能との統合を図る
                        // await userDoc.ref.update({ verificationStatus: "pending" });
                    }
                }
                break;
            }
            case "payment_intent.amount_capturable_updated":
            case "payment_intent.succeeded": {
                const paymentIntent = event.data.object as import("stripe").Stripe.PaymentIntent;
                const { jobId, contractId, type } = paymentIntent.metadata;

                console.log(`Processing payment event: ${event.type} for ${paymentIntent.id}`);

                if (type === "escrow") {
                    if (contractId) {
                        // Project Format: Update Contract Status
                        await db.collection("contracts").doc(contractId).update({
                            status: "escrow",
                            escrowAt: admin.firestore.FieldValue.serverTimestamp(),
                            stripePaymentIntentId: paymentIntent.id,
                            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                        });
                        console.log(`Contract ${contractId} status updated to escrow.`);
                        
                        // Notify Worker (Optional but recommended)
                        // await createNotification(...) 
                    } else if (jobId) {
                        // Competition/Task Format: Update Job Status
                        await db.collection("jobs").doc(jobId).update({
                            status: "open",
                            stripePaymentIntentId: paymentIntent.id,
                            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                        });
                        console.log(`Job ${jobId} status updated to open.`);
                    }
                }
                break;
            }
            default:
                console.log(`Unhandled event type ${event.type}`);
        }
    } catch (error) {
        console.error("Error processing webhook:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }

    return NextResponse.json({ received: true });
}
