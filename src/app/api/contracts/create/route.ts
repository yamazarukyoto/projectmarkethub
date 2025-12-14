import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";

export async function POST(req: Request) {
    try {
        // 1. Auth Check
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(token);
        const requestUserId = decodedToken.uid;

        const { proposalId, jobId, clientId, workerId, price, title } = await req.json();

        if (clientId !== requestUserId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // type is optional in request, default to 'project' if not provided, or fetch from job
        // But let's assume it's passed or we can fetch job to get type.
        // For now, let's fetch job to be safe and get type.
        const jobDoc = await adminDb.collection("jobs").doc(jobId).get();
        if (!jobDoc.exists) {
             return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }
        const jobData = jobDoc.data();
        const type = jobData?.type || "project";

        if (!jobId || !clientId || !workerId || !price) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Platform fee is 5%
        const platformFee = Math.floor(price * 0.05);
        const workerAmount = price - platformFee;

        // Check if contract already exists for this proposal
        if (proposalId) {
            const existingContracts = await adminDb.collection("contracts")
                .where("proposalId", "==", proposalId)
                .get();
            
            if (!existingContracts.empty) {
                return NextResponse.json({ error: "Contract already exists for this proposal" }, { status: 400 });
            }
        }

        // Check if job is already filled (prevent multiple contracts for single job)
        if (jobData?.status !== 'open') {
            return NextResponse.json({ error: "This job is no longer open" }, { status: 400 });
        }

        // 1. Create Contract in Firestore
        // For Competition, payment is already done at Job creation, so status is 'escrow'
        const isCompetition = type === 'competition';
        const initialStatus = isCompetition ? 'escrow' : 'waiting_for_escrow';
        const paymentIntentId = isCompetition ? (jobData?.stripePaymentIntentId || "") : "";
        const escrowAt = isCompetition ? admin.firestore.FieldValue.serverTimestamp() : null;

        const contractRef = await adminDb.collection("contracts").add({
            jobId,
            proposalId, // Save proposalId for linking back to chat
            clientId,
            workerId,
            jobTitle: title || jobData?.title,
            jobType: type, // Use jobType to match interface
            amount: price,
            tax: Math.floor(price * 0.1), // Add tax calculation
            totalAmount: Math.floor(price * 1.1), // Add total amount
            platformFee: platformFee,
            workerReceiveAmount: workerAmount,
            status: initialStatus,
            stripePaymentIntentId: paymentIntentId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            ...(escrowAt && { escrowAt }),
        });

        // 2. Update Proposal status (if exists)
        if (proposalId) {
            await adminDb.collection("proposals").doc(proposalId).update({
                status: "hired",
            });
        }

        // 3. Update Job status
        await adminDb.collection("jobs").doc(jobId).update({
            status: "filled",
        });

        return NextResponse.json({
            contractId: contractRef.id
        });

    } catch (error) {
        console.error("Contract Creation Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
