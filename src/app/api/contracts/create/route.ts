import { NextResponse } from "next/server";
import { adminDb, adminAuth, FieldValue } from "@/lib/firebase-admin";

// CORSヘッダーを追加するヘルパー関数
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS(req: Request) {
    return new NextResponse(null, {
        status: 204,
        headers: corsHeaders,
    });
}

export async function POST(req: Request) {
    const startTime = Date.now();
    const log = (msg: string) => console.log(`[Contract Create] [${Date.now() - startTime}ms] ${msg}`);
    
    log("API called");
    
    try {
        // 1. Auth Check
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            log("No auth header");
            return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
        }
        
        const token = authHeader.split("Bearer ")[1];
        log("Verifying token...");
        
        const decodedToken = await adminAuth.verifyIdToken(token);
        const requestUserId = decodedToken.uid;
        log(`Token verified, uid: ${requestUserId}`);

        // 2. Parse body
        let body;
        try {
            body = await req.json();
        } catch (e) {
            log("Invalid JSON body");
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400, headers: corsHeaders });
        }

        const { proposalId, jobId, clientId, workerId, price, title } = body;
        log(`Request: proposalId=${proposalId}, jobId=${jobId}`);

        // 3. Validation
        if (!jobId || !proposalId || !clientId || !workerId || !price) {
            log("Missing required fields");
            return NextResponse.json({ error: "Missing required fields" }, { status: 400, headers: corsHeaders });
        }

        if (clientId !== requestUserId) {
            log("Forbidden - clientId mismatch");
            return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: corsHeaders });
        }

        // 4. Check for existing contract (simple query - no composite index needed)
        log("Checking existing contracts...");
        const existingContracts = await adminDb.collection("contracts")
            .where("proposalId", "==", proposalId)
            .get();
        
        // Filter out cancelled contracts in code
        const activeContract = existingContracts.docs.find(doc => doc.data().status !== "cancelled");
        if (activeContract) {
            log(`Existing contract found: ${activeContract.id}`);
            return NextResponse.json({
                contractId: activeContract.id,
                isExisting: true
            }, { headers: corsHeaders });
        }
        log("No existing contract");

        // 5. Get job info (minimal)
        log("Fetching job...");
        const jobDoc = await adminDb.collection("jobs").doc(jobId).get();
        if (!jobDoc.exists) {
            log("Job not found");
            return NextResponse.json({ error: "Job not found" }, { status: 404, headers: corsHeaders });
        }
        const jobData = jobDoc.data();
        log("Job fetched");

        // 6. Create contract
        const platformFee = Math.floor(price * 0.05);
        const workerAmount = price - platformFee;

        log("Creating contract...");
        const contractRef = await adminDb.collection("contracts").add({
            jobId,
            proposalId,
            clientId,
            workerId,
            jobTitle: title || jobData?.title,
            jobType: "project",
            amount: price,
            tax: Math.floor(price * 0.1),
            totalAmount: Math.round(price * 1.1),
            platformFee: platformFee,
            workerReceiveAmount: workerAmount,
            status: "pending_signature",
            stripePaymentIntentId: "",
            createdAt: FieldValue.serverTimestamp(),
        });
        log(`Contract created: ${contractRef.id}`);

        // 7. Update proposal and job (parallel)
        log("Updating proposal and job...");
        await Promise.all([
            adminDb.collection("proposals").doc(proposalId).update({ status: "hired" }),
            adminDb.collection("jobs").doc(jobId).update({ status: "filled" })
        ]);
        log("Updates complete");

        log("Success");
        return NextResponse.json({ contractId: contractRef.id }, { headers: corsHeaders });

    } catch (error: any) {
        console.error("[Contract Create] Error:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" }, 
            { status: 500, headers: corsHeaders }
        );
    }
}
