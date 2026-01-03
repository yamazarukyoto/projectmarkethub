import { NextResponse } from "next/server";
import { adminAuth, adminDb, FieldValue } from "@/lib/firebase-admin";

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

export async function POST(request: Request) {
  try {
    // 1. 認証チェック
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const reviewerId = decodedToken.uid;

    const body = await request.json();
    const { contractId, revieweeId, rating, comment, role } = body;

    if (!contractId || !revieweeId || !rating || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 2. 契約の確認
    const contractRef = adminDb.collection("contracts").doc(contractId);
    const contractSnap = await contractRef.get();
    if (!contractSnap.exists) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }
    const contractData = contractSnap.data();

    // 権限チェック: 評価者は契約の当事者である必要がある
    if (role === 'client') {
        if (contractData?.clientId !== reviewerId) {
            return NextResponse.json({ error: "Not authorized to review as client" }, { status: 403 });
        }
    } else {
        if (contractData?.workerId !== reviewerId) {
            return NextResponse.json({ error: "Not authorized to review as worker" }, { status: 403 });
        }
    }

    // 3. レビューの作成
    const reviewData = {
      contractId,
      reviewerId,
      revieweeId,
      rating: Number(rating),
      comment,
      role,
      createdAt: FieldValue.serverTimestamp(),
    };
    
    await adminDb.collection("reviews").add(reviewData);

    // 4. 契約ステータスの更新
    const updateField = role === 'client' ? { clientReviewed: true } : { workerReviewed: true };
    await contractRef.update(updateField);

    // 5. ユーザー評価の再計算と更新
    // 注意: 直前に追加したレビューがクエリ結果に含まれることを期待するが、
    // Firestoreの整合性は結果整合性の場合があるため、念のためトランザクションを使うか、
    // あるいは単純に全件取得して計算する。
    // ここではシンプルに全件取得して計算する。
    
    const reviewsQuery = await adminDb.collection("reviews")
      .where("revieweeId", "==", revieweeId)
      .get();

    let totalRating = 0;
    let reviewCount = 0;
    
    // 役割別評価の計算用
    let clientTotalRating = 0;  // クライアントとしての評価（ワーカーから受けた評価）
    let clientReviewCount = 0;
    let workerTotalRating = 0;  // ワーカーとしての評価（クライアントから受けた評価）
    let workerReviewCount = 0;

    reviewsQuery.forEach(doc => {
      const data = doc.data();
      if (data.rating) {
        totalRating += data.rating;
        reviewCount++;
        
        // 役割別に集計
        // role === 'client' の場合、クライアントが評価した = ワーカーとしての評価
        // role === 'worker' の場合、ワーカーが評価した = クライアントとしての評価
        if (data.role === 'client') {
          workerTotalRating += data.rating;
          workerReviewCount++;
        } else if (data.role === 'worker') {
          clientTotalRating += data.rating;
          clientReviewCount++;
        }
      }
    });

    const averageRating = reviewCount > 0 ? parseFloat((totalRating / reviewCount).toFixed(1)) : 0;
    const clientAverageRating = clientReviewCount > 0 ? parseFloat((clientTotalRating / clientReviewCount).toFixed(1)) : 0;
    const workerAverageRating = workerReviewCount > 0 ? parseFloat((workerTotalRating / workerReviewCount).toFixed(1)) : 0;

    await adminDb.collection("users").doc(revieweeId).update({
      // 総合評価（後方互換性のため維持）
      rating: averageRating,
      reviewCount: reviewCount,
      // 役割別評価
      clientRating: clientAverageRating,
      clientReviewCount: clientReviewCount,
      workerRating: workerAverageRating,
      workerReviewCount: workerReviewCount
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Error creating review:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
