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
    } catch (error: any) {
        console.error(`Webhook signature verification failed: ${error.message}`);
        return NextResponse.json({ error: "Webhook Error" }, { status: 400 });
    }

    try {
        switch (event.type) {
            case "identity.verification_session.verified": {
                const session = event.data.object as any;
                const userId = session.metadata.userId;
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
                const session = event.data.object as any;
                const userId = session.metadata.userId;
                const lastError = session.last_error;
                if (userId) {
                    await db.collection("users").doc(userId).update({
                        verificationStatus: "rejected",
                        verificationRejectionReason: lastError?.message || "Verification failed. Please try again.",
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                    console.log(`User ${userId} verification requires input/rejected.`);
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
