import { NextResponse } from "next/server";
import { adminDb, adminAuth, FieldValue } from "@/lib/firebase-admin";

export async function OPTIONS(req: Request) {
    return new NextResponse(null, {
        status: 204,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
    });
}

export async function POST(req: Request) {
    const startTime = Date.now();
    const log = (msg: string) => console.log(`[Contract Create] [${Date.now() - startTime}ms] ${msg}`);
    
    log("API called");
    try {
        // 1. Auth Check
        log("Checking auth header...");
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            console.log("[Contract Create] No auth header, returning 401");
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.split("Bearer ")[1];
        log("Verifying token...");
        const decodedToken = await adminAuth.verifyIdToken(token);
        log("Token verified, uid: " + decodedToken.uid);
        const requestUserId = decodedToken.uid;

        let body;
        try {
            body = await req.json();
        } catch (e) {
            console.error("[Contract Create] Invalid JSON body:", e);
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        const { proposalId, jobId, clientId, workerId, price, title } = body;

        if (!jobId) {
            console.error("[Contract Create] Missing jobId");
            return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
        }

        if (!proposalId) {
            console.error("[Contract Create] Missing proposalId");
            return NextResponse.json({ error: "Proposal ID is required" }, { status: 400 });
        }

        if (clientId !== requestUserId) {
            console.error("[Contract Create] Forbidden access", { clientId, requestUserId });
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // type is optional in request, default to 'project' if not provided, or fetch from job
        // But let's assume it's passed or we can fetch job to get type.
        // For now, let's fetch job to be safe and get type.
        log("Fetching job: " + jobId);
        const jobDoc = await adminDb.collection("jobs").doc(jobId).get();
        log("Job fetched");
        if (!jobDoc.exists) {
             log("Job not found: " + jobId);
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

        // Check for existing active contracts for this proposal first
        // This allows re-contracting after cancellation
        log("Checking for existing contracts for proposalId: " + proposalId);
        
        log("Querying contracts by proposalId...");
        const proposalContracts = await adminDb.collection("contracts")
            .where("proposalId", "==", proposalId)
            .get();
        log("Proposal contracts query done, count: " + proposalContracts.size);
        
        const activeProposalContract = proposalContracts.docs.find(doc => doc.data().status !== 'cancelled');
        
        if (activeProposalContract) {
            log("Existing active contract found: " + activeProposalContract.id);
            
            // Check if the client matches (security check)
            if (activeProposalContract.data().clientId !== clientId) {
                console.error("[Contract Create] Existing contract belongs to another client");
                return NextResponse.json({ error: "この提案は既に他のクライアントと契約済みです" }, { status: 400 });
            }

            return NextResponse.json({
                contractId: activeProposalContract.id,
                isExisting: true
            });
        }
        
        // Check if the job is already filled by another contract (not this proposal)
        // This check should be done BEFORE creating a new contract
        const jobRef = adminDb.collection("jobs").doc(jobId);
        const jobSnapshot = await jobRef.get();
        if (jobSnapshot.exists && jobSnapshot.data()?.status === 'filled') {
             // Double check if it's filled by THIS proposal (which should have been caught above)
             // If we are here, it means no active contract for this proposal, but job is filled.
             // This means another proposal was accepted.
             console.error("[Contract Create] Job is already filled");
             return NextResponse.json({ error: "この案件は既に他のワーカーと契約済みです" }, { status: 400 });
        }
        
        // Check for existing active contracts for this job by other workers
        log("Querying contracts by jobId...");
        const jobContracts = await adminDb.collection("contracts")
            .where("jobId", "==", jobId)
            .get();
        log("Job contracts query done, count: " + jobContracts.size);
        
        const activeJobContracts = jobContracts.docs.filter(doc => 
            doc.data().status !== 'cancelled' && doc.data().proposalId !== proposalId
        );
        
        if (activeJobContracts.length > 0) {
            // Active contract exists for another worker -> Job is filled by someone else
            console.log("[Contract Create] Job already filled by another worker");
            return NextResponse.json({ error: "この案件は既に他のワーカーと契約済みです" }, { status: 400 });
        }

        // 1. Create Contract in Firestore
        // For Competition, payment is already done at Job creation, so status is 'escrow'
        const isCompetition = type === 'competition';
        // Initial status is 'pending_signature' for project type - worker must agree before payment
        const initialStatus = isCompetition ? 'escrow' : 'pending_signature';
        const paymentIntentId = isCompetition ? (jobData?.stripePaymentIntentId || "") : "";
        const escrowAt = isCompetition ? FieldValue.serverTimestamp() : null;

        log("Creating contract...");
        const contractRef = await adminDb.collection("contracts").add({
            jobId,
            proposalId, // Save proposalId for linking back to chat
            clientId,
            workerId,
            jobTitle: title || jobData?.title,
            jobType: type, // Use jobType to match interface
            amount: price,
            tax: Math.floor(price * 0.1), // Add tax calculation
            totalAmount: Math.round(price * 1.1), // Add total amount (Round to nearest integer)
            platformFee: platformFee,
            workerReceiveAmount: workerAmount,
            status: initialStatus,
            stripePaymentIntentId: paymentIntentId,
            createdAt: FieldValue.serverTimestamp(),
            ...(escrowAt && { escrowAt }),
        });
        log("Contract created: " + contractRef.id);

        // 2. Update Proposal status (if exists)
        if (proposalId) {
            log("Updating proposal status...");
            await adminDb.collection("proposals").doc(proposalId).update({
                status: "hired",
            });
            log("Proposal updated");
        }

        // 3. Update Job status
        log("Updating job status...");
        await adminDb.collection("jobs").doc(jobId).update({
            status: "filled",
        });
        log("Job updated");

        log("Returning success response");
        return NextResponse.json({
            contractId: contractRef.id
        });

    } catch (error) {
        console.error("Contract Creation Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
