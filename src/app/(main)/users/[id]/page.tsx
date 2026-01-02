"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { getUser, getUserReviews, getCompletedContractsCount } from "@/lib/db";
import { User, Review } from "@/types";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ArrowLeft, Star, Briefcase, Clock, DollarSign, CheckCircle, MessageSquare, User as UserIcon, Building2, Wrench, Loader2, Globe, MapPin } from "lucide-react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function UserProfilePage() {
    const params = useParams();
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const [user, setUser] = useState<User | null>(null);
    const [workerReviews, setWorkerReviews] = useState<Review[]>([]);
    const [clientReviews, setClientReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [reviewerNames, setReviewerNames] = useState<{ [key: string]: string }>({});
    const [activeTab, setActiveTab] = useState<'worker' | 'client'>('worker');
    const [isCreatingRoom, setIsCreatingRoom] = useState(false);
    const [completedCount, setCompletedCount] = useState<number>(0);

    // 直接メッセージ用のルームIDを生成（2人のユーザーIDをソートして結合）
    const generateDMRoomId = (userId1: string, userId2: string): string => {
        const sortedIds = [userId1, userId2].sort();
        return `dm_${sortedIds[0]}_${sortedIds[1]}`;
    };

    // 直接メッセージルームを作成または取得してメッセージページへ遷移
    const handleSendMessage = async () => {
        if (!currentUser || !user) return;
        
        setIsCreatingRoom(true);
        try {
            const roomId = generateDMRoomId(currentUser.uid, user.uid);
            const roomRef = doc(db, "rooms", roomId);
            const roomSnap = await getDoc(roomRef);
            
            // ルームが存在しない場合は作成
            if (!roomSnap.exists()) {
                await setDoc(roomRef, {
                    participants: {
                        [currentUser.uid]: true,
                        [user.uid]: true
                    },
                    type: 'dm', // 直接メッセージであることを示す
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
            }
            
            // メッセージページへ遷移
            router.push(`/messages/${roomId}`);
        } catch (error) {
            console.error("Error creating DM room:", error);
            alert("メッセージルームの作成に失敗しました。もう一度お試しください。");
        } finally {
            setIsCreatingRoom(false);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            if (params.id) {
                try {
                    const userData = await getUser(params.id as string);
                    setUser(userData);
                    
                    // ワーカーとしての評価を取得（クライアントから受けた評価）
                    const workerReviewsData = await getUserReviews(params.id as string, 10, 'worker');
                    setWorkerReviews(workerReviewsData);
                    
                    // クライアントとしての評価を取得（ワーカーから受けた評価）
                    const clientReviewsData = await getUserReviews(params.id as string, 10, 'client');
                    setClientReviews(clientReviewsData);
                    
                    // 評価者の名前を取得
                    const allReviews = [...workerReviewsData, ...clientReviewsData];
                    const names: { [key: string]: string } = {};
                    for (const review of allReviews) {
                        if (!names[review.reviewerId]) {
                            const reviewer = await getUser(review.reviewerId);
                            names[review.reviewerId] = reviewer?.displayName || "匿名ユーザー";
                        }
                    }
                    setReviewerNames(names);
                    
                    // 完了案件数を取得（contractsコレクションから実際の数を取得）
                    const count = await getCompletedContractsCount(params.id as string);
                    setCompletedCount(count);
                } catch (error) {
                    console.error("Error fetching user:", error);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchData();
    }, [params.id]);

    if (loading) return <div className="p-8 text-center">読み込み中...</div>;
    if (!user) return <div className="p-8 text-center">ユーザーが見つかりません</div>;

    // ワーカープロフィールがあるかどうか
    const hasWorkerProfile = user.workerProfile && (user.workerProfile.title || user.workerProfile.bio);
    
    // クライアントプロフィールがあるかどうか（ネスト構造とフラット構造の両方に対応）
    const clientProfile = (user.clientProfile || {}) as {
        companyName?: string;
        description?: string;
        website?: string;
        industry?: string;
        companyAddress?: string;
        companyPhone?: string;
    };
    // フラット構造のフォールバック（既存データ対応）
    const flatCompanyName = (user as any).companyName;
    const flatCompanyDescription = (user as any).companyDescription;
    const flatCompanyWebsite = (user as any).companyWebsite;
    
    const hasClientProfile = 
        (clientProfile.companyName || clientProfile.description || clientProfile.website) ||
        (flatCompanyName || flatCompanyDescription || flatCompanyWebsite);
    
    // クライアントプロフィールの値を取得（ネスト構造優先、フラット構造フォールバック）
    const clientCompanyName = clientProfile.companyName || flatCompanyName;
    const clientDescription = clientProfile.description || flatCompanyDescription;
    const clientWebsite = clientProfile.website || flatCompanyWebsite;
    const clientIndustry = clientProfile.industry;

    // 評価コンポーネント
    const ReviewList = ({ reviews, emptyMessage }: { reviews: Review[], emptyMessage: string }) => (
        reviews.length > 0 ? (
            <div className="space-y-4">
                {reviews.map((review) => (
                    <div key={review.id} className="border-b border-gray-100 pb-4 last:border-b-0 last:pb-0">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                                <UserIcon size={20} className="text-gray-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                    <span className="font-medium text-gray-900 truncate">
                                        {reviewerNames[review.reviewerId] || "匿名ユーザー"}
                                    </span>
                                    <span className="text-xs text-gray-500 whitespace-nowrap">
                                        {review.createdAt?.toDate().toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1 mb-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                            key={star}
                                            size={14}
                                            className={star <= review.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}
                                        />
                                    ))}
                                    <span className="text-sm text-gray-600 ml-1">{review.rating.toFixed(1)}</span>
                                </div>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{review.comment}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        ) : (
            <p className="text-gray-500 text-center py-4">{emptyMessage}</p>
        )
    );

    return (
        <div className="container mx-auto px-4 py-8">
            <Button variant="ghost" className="mb-4 pl-0" onClick={() => router.back()}>
                <ArrowLeft size={20} className="mr-2" />
                戻る
            </Button>

            {/* 基本情報セクション */}
            <Card className="mb-8">
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                        <div className="w-32 h-32 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                            {user.photoURL ? (
                                <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-gray-300 flex items-center justify-center text-gray-500 text-4xl">
                                    {user.displayName?.charAt(0) || "U"}
                                </div>
                            )}
                        </div>
                        <div className="flex-1 text-center md:text-left">
                            <h1 className="text-2xl font-bold text-secondary mb-1">{user.displayName}</h1>
                            {user.verificationStatus === 'approved' && (
                                <div className="flex items-center justify-center md:justify-start text-green-600 text-sm mb-2">
                                    <CheckCircle size={16} className="mr-1" />
                                    本人確認済み
                                </div>
                            )}
                            <div className="flex items-center justify-center md:justify-start gap-2 text-gray-600 mb-4">
                                <Briefcase size={16} />
                                <span>完了案件: {completedCount}件</span>
                            </div>
                            
                            {/* Message Button (Only if logged in and not self) */}
                            {currentUser && currentUser.uid !== user.uid && (
                                <Button 
                                    onClick={handleSendMessage}
                                    disabled={isCreatingRoom}
                                >
                                    {isCreatingRoom ? (
                                        <Loader2 size={18} className="mr-2 animate-spin" />
                                    ) : (
                                        <MessageSquare size={18} className="mr-2" />
                                    )}
                                    {isCreatingRoom ? "準備中..." : "メッセージを送る"}
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* ワーカー情報セクション */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Wrench size={20} className="text-blue-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">ワーカー情報</h2>
                    </div>

                    {/* ワーカー評価 */}
                    <Card className="border-blue-200">
                        <CardHeader className="bg-blue-50 border-b border-blue-100">
                            <CardTitle className="text-lg flex items-center gap-2 text-blue-800">
                                <Star size={18} className="text-yellow-500 fill-yellow-500" />
                                ワーカーとしての評価
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                                <div className="text-3xl font-bold text-blue-600">{(user.workerRating || 0).toFixed(1)}</div>
                                <div className="flex items-center gap-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                            key={star}
                                            size={20}
                                            className={star <= Math.round(user.workerRating || 0) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}
                                        />
                                    ))}
                                </div>
                                <span className="text-gray-500">({user.workerReviewCount || 0}件)</span>
                            </div>
                        </CardContent>
                    </Card>

                    {hasWorkerProfile ? (
                        <>
                            {/* ワーカープロフィール */}
                            <Card className="border-blue-200">
                                <CardHeader className="bg-blue-50 border-b border-blue-100">
                                    <CardTitle className="text-lg text-blue-800">プロフィール</CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 space-y-4">
                                    {user.workerProfile?.title && (
                                        <div>
                                            <h3 className="text-sm font-bold text-gray-500 mb-1">職種・肩書き</h3>
                                            <p className="text-gray-900">{user.workerProfile.title}</p>
                                        </div>
                                    )}
                                    {user.workerProfile?.bio && (
                                        <div>
                                            <h3 className="text-sm font-bold text-gray-500 mb-1">自己紹介</h3>
                                            <p className="whitespace-pre-wrap text-gray-700">{user.workerProfile.bio}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* スキル */}
                            <Card className="border-blue-200">
                                <CardHeader className="bg-blue-50 border-b border-blue-100">
                                    <CardTitle className="text-lg text-blue-800">スキル</CardTitle>
                                </CardHeader>
                                <CardContent className="p-4">
                                    <div className="flex flex-wrap gap-2">
                                        {user.workerProfile?.skills && user.workerProfile.skills.length > 0 ? (
                                            user.workerProfile.skills.map((skill, index) => (
                                                <span key={index} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                                                    {skill}
                                                </span>
                                            ))
                                        ) : (
                                            <p className="text-gray-500">登録されているスキルはありません。</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* 稼働条件 */}
                            <Card className="border-blue-200">
                                <CardHeader className="bg-blue-50 border-b border-blue-100">
                                    <CardTitle className="text-lg text-blue-800">稼働条件</CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <Clock size={18} className="text-blue-500" />
                                        <div>
                                            <p className="text-xs text-gray-500">稼働可能時間</p>
                                            <p className="font-medium">{user.workerProfile?.hoursPerWeek || "未設定"}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <DollarSign size={18} className="text-blue-500" />
                                        <div>
                                            <p className="text-xs text-gray-500">希望単価</p>
                                            <p className="font-medium">
                                                {user.workerProfile?.desiredUnitPrice 
                                                    ? `${user.workerProfile.desiredUnitPrice.toLocaleString()}円 / 時間` 
                                                    : "相談による"}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    ) : (
                        <Card className="border-blue-200">
                            <CardContent className="p-8 text-center text-gray-500">
                                ワーカープロフィールは登録されていません。
                            </CardContent>
                        </Card>
                    )}

                    {/* ワーカーとしてのレビュー */}
                    <Card className="border-blue-200">
                        <CardHeader className="bg-blue-50 border-b border-blue-100">
                            <CardTitle className="text-lg text-blue-800">クライアントからのレビュー</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                            <ReviewList 
                                reviews={workerReviews} 
                                emptyMessage="ワーカーとしての評価はまだありません" 
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* クライアント情報セクション */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                            <Building2 size={20} className="text-green-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">クライアント情報</h2>
                    </div>

                    {/* クライアント評価 */}
                    <Card className="border-green-200">
                        <CardHeader className="bg-green-50 border-b border-green-100">
                            <CardTitle className="text-lg flex items-center gap-2 text-green-800">
                                <Star size={18} className="text-yellow-500 fill-yellow-500" />
                                クライアントとしての評価
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                                <div className="text-3xl font-bold text-green-600">{(user.clientRating || 0).toFixed(1)}</div>
                                <div className="flex items-center gap-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                            key={star}
                                            size={20}
                                            className={star <= Math.round(user.clientRating || 0) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}
                                        />
                                    ))}
                                </div>
                                <span className="text-gray-500">({user.clientReviewCount || 0}件)</span>
                            </div>
                        </CardContent>
                    </Card>

                    {hasClientProfile ? (
                        <>
                            {/* 会社・事業情報 */}
                            <Card className="border-green-200">
                                <CardHeader className="bg-green-50 border-b border-green-100">
                                    <CardTitle className="text-lg text-green-800">会社・事業情報</CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 space-y-4">
                                    {clientCompanyName && (
                                        <div className="flex items-start gap-3">
                                            <Building2 size={18} className="text-green-500 mt-0.5" />
                                            <div>
                                                <p className="text-xs text-gray-500">会社名・屋号</p>
                                                <p className="font-medium text-gray-900">{clientCompanyName}</p>
                                            </div>
                                        </div>
                                    )}
                                    {clientIndustry && (
                                        <div className="flex items-start gap-3">
                                            <Briefcase size={18} className="text-green-500 mt-0.5" />
                                            <div>
                                                <p className="text-xs text-gray-500">業種</p>
                                                <p className="font-medium text-gray-900">{
                                                    {
                                                        'it': 'IT・通信',
                                                        'manufacturing': '製造業',
                                                        'retail': '小売・卸売',
                                                        'service': 'サービス業',
                                                        'finance': '金融・保険',
                                                        'real_estate': '不動産',
                                                        'construction': '建設',
                                                        'medical': '医療・福祉',
                                                        'education': '教育',
                                                        'media': 'メディア・広告',
                                                        'other': 'その他'
                                                    }[clientIndustry] || clientIndustry
                                                }</p>
                                            </div>
                                        </div>
                                    )}
                                    {clientWebsite && (
                                        <div className="flex items-start gap-3">
                                            <Globe size={18} className="text-green-500 mt-0.5" />
                                            <div>
                                                <p className="text-xs text-gray-500">Webサイト</p>
                                                <a href={clientWebsite} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                                    {clientWebsite}
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                    {clientDescription && (
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">事業内容</p>
                                            <p className="whitespace-pre-wrap text-gray-700">{clientDescription}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </>
                    ) : (
                        <Card className="border-green-200">
                            <CardContent className="p-8 text-center text-gray-500">
                                クライアントプロフィールは登録されていません。
                            </CardContent>
                        </Card>
                    )}

                    {/* クライアントとしてのレビュー */}
                    <Card className="border-green-200">
                        <CardHeader className="bg-green-50 border-b border-green-100">
                            <CardTitle className="text-lg text-green-800">ワーカーからのレビュー</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                            <ReviewList 
                                reviews={clientReviews} 
                                emptyMessage="クライアントとしての評価はまだありません" 
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
