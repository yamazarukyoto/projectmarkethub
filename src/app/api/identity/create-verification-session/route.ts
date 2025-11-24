import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { adminAuth } from "@/lib/firebase-admin";

export async function POST(req: Request) {
    try {
        console.log("Starting verification session creation...");
        
        // Debug environment variables
        console.log("Environment check:", {
            hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
            baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
            hasFirebasePrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
        });

        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            console.error("Missing or invalid Authorization header");
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(token);
        const userId = decodedToken.uid;

        if (!userId) {
            console.error("No userId found in token");
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        console.log(`Creating verification session for user: ${userId}`);

        if (!process.env.NEXT_PUBLIC_BASE_URL) {
            console.error("NEXT_PUBLIC_BASE_URL is not defined in environment variables");
            throw new Error("NEXT_PUBLIC_BASE_URL is not defined");
        }

        const returnUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/account/verification`;
        console.log("Using return_url:", returnUrl);

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

        console.log("Verification session created successfully:", verificationSession.id);
        console.log("Redirect URL:", verificationSession.url);
        return NextResponse.json({ url: verificationSession.url });
    } catch (error: any) {
        console.error("Error creating verification session:", error);
        // Log more details if it's a Stripe error
        if (error.type) {
            console.error("Stripe Error Type:", error.type);
            console.error("Stripe Error Code:", error.code);
            console.error("Stripe Error Message:", error.message);
        }
        return NextResponse.json(
            { error: "Internal Server Error", details: error.message },
            { status: 500 }
        );
    }
}
