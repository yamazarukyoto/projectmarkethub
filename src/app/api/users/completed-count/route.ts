import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

// CORSヘッダー
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// OPTIONSリクエスト（プリフライト）対応
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");

        if (!userId) {
            return NextResponse.json({ error: "userId is required" }, { status: 400, headers: corsHeaders });
        }

        // Get completed contracts count for the user as a worker
        const contractsSnapshot = await adminDb
            .collection("contracts")
            .where("workerId", "==", userId)
            .where("status", "==", "completed")
            .get();

        return NextResponse.json({ count: contractsSnapshot.size }, { headers: corsHeaders });
    } catch (error) {
        console.error("Error getting completed contracts count:", error);
        return NextResponse.json({ error: "Failed to get completed contracts count" }, { status: 500, headers: corsHeaders });
    }
}
