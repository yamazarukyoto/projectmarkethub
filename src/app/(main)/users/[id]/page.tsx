"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { getUser } from "@/lib/db";
import { User } from "@/types";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ArrowLeft, Star, Briefcase, Clock, DollarSign, CheckCircle, MessageSquare } from "lucide-react";

export default function UserProfilePage() {
    const params = useParams();
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (params.id) {
                try {
                    const userData = await getUser(params.id as string);
                    setUser(userData);
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

    return (
        <div className="container mx-auto px-4 py-8">
            <Button variant="ghost" className="mb-4 pl-0" onClick={() => router.back()}>
                <ArrowLeft size={20} className="mr-2" />
                戻る
            </Button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Basic Info */}
                <div className="space-y-6">
                    <Card>
                        <CardContent className="p-6 flex flex-col items-center text-center">
                            <div className="w-32 h-32 rounded-full bg-gray-200 overflow-hidden mb-4">
                                {user.photoURL ? (
                                    <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gray-300 flex items-center justify-center text-gray-500 text-4xl">
                                        {user.displayName?.charAt(0) || "U"}
                                    </div>
                                )}
                            </div>
                            <h1 className="text-2xl font-bold text-secondary mb-1">{user.displayName}</h1>
                            {user.verificationStatus === 'approved' && (
                                <div className="flex items-center justify-center text-green-600 text-sm mb-4">
                                    <CheckCircle size={16} className="mr-1" />
                                    本人確認済み
                                </div>
                            )}
                            
                            {hasWorkerProfile && (
                                <p className="text-gray-600 mb-6">{user.workerProfile?.title}</p>
                            )}

                            <div className="w-full space-y-3 text-left">
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <Star size={18} className="text-yellow-500" />
                                        <span>評価</span>
                                    </div>
                                    <span className="font-bold">{user.rating?.toFixed(1) || "0.0"} <span className="text-xs font-normal text-gray-500">({user.reviewCount || 0}件)</span></span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <Briefcase size={18} />
                                        <span>完了案件</span>
                                    </div>
                                    <span className="font-bold">{user.jobsCompleted || 0}件</span>
                                </div>
                            </div>

                            {/* Message Button (Only if logged in and not self) */}
                            {currentUser && currentUser.uid !== user.uid && (
                                <Button className="w-full mt-6" onClick={() => alert("メッセージ機能は案件詳細ページから利用してください（直接メッセージは未実装）")}>
                                    <MessageSquare size={18} className="mr-2" />
                                    メッセージを送る
                                </Button>
                            )}
                        </CardContent>
                    </Card>

                    {hasWorkerProfile && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">稼働条件</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <Clock size={20} className="text-gray-400" />
                                    <div>
                                        <p className="text-xs text-gray-500">稼働可能時間</p>
                                        <p className="font-medium">{user.workerProfile?.hoursPerWeek || "未設定"}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <DollarSign size={20} className="text-gray-400" />
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
                    )}
                </div>

                {/* Right Column: Details */}
                <div className="lg:col-span-2 space-y-6">
                    {hasWorkerProfile ? (
                        <>
                            <Card>
                                <CardHeader>
                                    <CardTitle>自己紹介</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="prose max-w-none whitespace-pre-wrap text-gray-700">
                                        {user.workerProfile?.bio || "自己紹介はまだありません。"}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>スキル</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-2">
                                        {user.workerProfile?.skills && user.workerProfile.skills.length > 0 ? (
                                            user.workerProfile.skills.map((skill, index) => (
                                                <span key={index} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                                                    {skill}
                                                </span>
                                            ))
                                        ) : (
                                            <p className="text-gray-500">登録されているスキルはありません。</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    ) : (
                        <Card>
                            <CardContent className="p-8 text-center text-gray-500">
                                プロフィール詳細情報は登録されていません。
                            </CardContent>
                        </Card>
                    )}

                    {/* Client Profile (if exists) */}
                    {user.clientProfile && (user.clientProfile.companyName || user.clientProfile.description) && (
                        <Card>
                            <CardHeader>
                                <CardTitle>クライアント情報</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {user.clientProfile.companyName && (
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-500 mb-1">会社名・屋号</h3>
                                        <p>{user.clientProfile.companyName}</p>
                                    </div>
                                )}
                                {user.clientProfile.website && (
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-500 mb-1">Webサイト</h3>
                                        <a href={user.clientProfile.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                            {user.clientProfile.website}
                                        </a>
                                    </div>
                                )}
                                {user.clientProfile.description && (
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-500 mb-1">事業内容</h3>
                                        <p className="whitespace-pre-wrap text-gray-700">{user.clientProfile.description}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
