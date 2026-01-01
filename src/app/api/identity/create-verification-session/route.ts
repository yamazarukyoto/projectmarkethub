import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { adminAuth } from "@/lib/firebase-admin";

export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(token);
        const userId = decodedToken.uid;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!process.env.NEXT_PUBLIC_BASE_URL) {
            throw new Error("NEXT_PUBLIC_BASE_URL is not defined");
        }

        const returnUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/account/verification`;

        // Stripeが無効な場合のデモ動作 (開発環境用)
        if (!process.env.STRIPE_SECRET_KEY) {
            console.warn("Stripe is not configured. Simulating Identity Verification.");
            
            const { adminDb } = await import("@/lib/firebase-admin");
            await adminDb.collection("users").doc(userId).update({
                verificationStatus: "approved",
            });

            return NextResponse.json({ 
                url: returnUrl 
            });
        }

        // Create a Verification Session
        const verificationSession = await stripe.identity.verificationSessions.create({
            type: 'document',
            metadata: {
                userId: userId,
            },
            options: {
                document: {
                    require_matching_selfie: true,
                },
            },
            return_url: returnUrl,
        });

        return NextResponse.json({ url: verificationSession.url });
    } catch (error: unknown) {
        console.error("Error creating verification session:", error);
        
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        return NextResponse.json(
            { error: "Internal Server Error", details: errorMessage },
            { status: 500 }
        );
    }
}
