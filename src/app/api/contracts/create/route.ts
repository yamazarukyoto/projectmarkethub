import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, addDoc, collection, Timestamp } from "firebase/firestore";

export async function POST(req: Request) {
    try {
        const { proposalId, jobId, clientId, workerId, price, title, type } = await req.json();

        if (!jobId || !clientId || !workerId || !price || !type) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Platform fee is 5%
        const platformFee = Math.floor(price * 0.05);
        const workerAmount = price - platformFee;

        // Get worker's Stripe Account ID
        const workerDoc = await getDoc(doc(db, "users", workerId));
        const workerStripeId = workerDoc.data()?.stripeAccountId;

        if (!workerStripeId) {
            return NextResponse.json({ error: "Worker has not connected Stripe" }, { status: 400 });
        }

        let paymentIntentId = "";
        let clientSecret = "";

        // For Fixed Price, create PaymentIntent for Escrow
        const paymentIntent = await stripe.paymentIntents.create({
            amount: price,
            currency: "jpy",
            payment_method_types: ["card"],
            transfer_data: {
                destination: workerStripeId,
            },
            application_fee_amount: platformFee,
            capture_method: "manual", // Escrow
            metadata: {
                jobId,
                proposalId: proposalId || "",
                clientId,
                workerId,
                type: "contract_payment",
            },
        });
        paymentIntentId = paymentIntent.id;
        clientSecret = paymentIntent.client_secret || "";

        // 2. Create Contract in Firestore
        const contractRef = await addDoc(collection(db, "contracts"), {
            jobId,
            clientId,
            workerId,
            jobTitle: title,
            type,
            amount: price,
            tax: 0,
            platformFee: platformFee,
            workerReceiveAmount: workerAmount,
            status: "escrow",
            stripePaymentIntentId: paymentIntentId,
            createdAt: Timestamp.now(),
        });

        // 3. Update Proposal status (if exists)
        if (proposalId) {
            await updateDoc(doc(db, "proposals", proposalId), {
                status: "hired",
            });
        }

        // 4. Update Job status
        await updateDoc(doc(db, "jobs", jobId), {
            status: "filled",
        });

        return NextResponse.json({
            contractId: contractRef.id,
            clientSecret: clientSecret
        });

    } catch (error) {
        console.error("Contract Creation Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
