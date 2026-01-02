"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { ChatBox } from "@/components/features/message/ChatBox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { getJob, getProposal, addNegotiationMessage } from "@/lib/db";
import { Job, Proposal, Contract, User } from "@/types";
import { doc, onSnapshot, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { getUser } from "@/lib/db";
import { ArrowLeft, DollarSign, Calendar, CheckCircle, CreditCard, Clock, MessageSquare } from "lucide-react";

// Force dynamic rendering to avoid caching issues
export const dynamic = 'force-dynamic';

export default function MessageRoomPage() {
    const params = useParams();
    const router = useRouter();
    const roomId = params.roomId as string; // roomId is proposalId or contractId
    const { user } = useAuth();
    
    const [proposal, setProposal] = useState<Proposal | null>(null);
    const [contract, setContract] = useState<Contract | null>(null);
    const [job, setJob] = useState<Job | null>(null);
    const [loading, setLoading] = useState(true);
    const [negotiationPrice, setNegotiationPrice] = useState<number>(0);
    const [negotiationMessage, setNegotiationMessage] = useState("");
    const [isNegotiating, setIsNegotiating] = useState(false);
    const [isContractRoom, setIsContractRoom] = useState(false);
    const [isRoomReady, setIsRoomReady] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [isCreatingContract, setIsCreatingContract] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    
    // 直接メッセージモード用のステート
    const [isDirectMessage, setIsDirectMessage] = useState(false);
    const [partnerUser, setPartnerUser] = useState<User | null>(null);

    // 直接メッセージモードの検出と相手ユーザー情報の取得
    useEffect(() => {
        if (!roomId || !user) return;
        
        // dm_ プレフィックスで始まる場合は直接メッセージモード
        if (roomId.startsWith('dm_')) {
            setIsDirectMessage(true);
            
            // roomId から相手のユーザーIDを抽出
            // フォーマット: dm_${userId1}_${userId2} (アルファベット順でソート済み)
            const parts = roomId.split('_');
            if (parts.length === 3) {
                const [, id1, id2] = parts;
                const partnerId = id1 === user.uid ? id2 : id1;
                
                // 相手ユーザー情報を取得
                getUser(partnerId).then(partnerData => {
                    setPartnerUser(partnerData);
                    setLoading(false);
                    setIsRoomReady(true);
                }).catch(err => {
                    console.error("Error fetching partner user:", err);
                    setLoading(false);
                });
            } else {
                setLoading(false);
            }
            return;
        }
        
        // 通常モード（提案/契約ベース）
        setIsDirectMessage(false);
    }, [roomId, user]);

    useEffect(() => {
        if (!roomId || !user || isDirectMessage) return;

        // First, try to find as proposal
        const unsubProposal = onSnapshot(doc(db, "proposals", roomId), async (docSnap) => {
            if (docSnap.exists()) {
                const p = { id: docSnap.id, ...docSnap.data() } as Proposal;
                setProposal(p);
                setNegotiationPrice(p.price);
                setIsContractRoom(false);

                // Fetch job if not already fetched
                if (!job) {
                    const j = await getJob(p.jobId);
                    setJob(j);
                }

                // Fetch contract if exists (for project type)
                // プロジェクト方式では roomId = proposalId なので、この proposalId に紐づく契約を探す
                try {
                    // クライアントサイドでクエリを実行して契約を探す
                    // セキュリティルール対策: clientId または workerId を条件に含める
                    const { collection, query, where, getDocs } = await import("firebase/firestore");
                    
                    // 自分がクライアントかワーカーかを判定
                    const isClientUser = user.uid === p.clientId;
                    const userField = isClientUser ? "clientId" : "workerId";

                    // 複合クエリがインデックス未反映などで失敗する可能性を考慮し、
                    // まずはユーザーIDだけで検索し、メモリ上でフィルタリングする（確実性優先）
                    const q = query(
                        collection(db, "contracts"), 
                        where(userField, "==", user.uid)
                    );
                    const querySnapshot = await getDocs(q);
                    
                    // proposalIdが一致し、キャンセルされていない最新の契約を取得
                    const activeContract = querySnapshot.docs
                        .map(doc => ({ id: doc.id, ...doc.data() } as Contract))
                        .find(c => c.proposalId === roomId && c.status !== 'cancelled');
                        
                    if (activeContract) {
                        setContract(activeContract);
                    }
                } catch (error: any) {
                    console.error("Error fetching contract for proposal:", error);
                    setErrorMessage(`契約情報の取得エラー: ${error.message}`);
                }

                setLoading(false);
            } else {
                // If not found as proposal, try as contract (for competition type)
                const contractSnap = await getDoc(doc(db, "contracts", roomId));
                if (contractSnap.exists()) {
                    const c = { id: contractSnap.id, ...contractSnap.data() } as Contract;
                    setContract(c);
                    setIsContractRoom(true);
                    
                    // Fetch job
                    if (!job) {
                        const j = await getJob(c.jobId);
                        setJob(j);
                    }
                    
                    // コンペ方式の場合、proposalIdがあれば提案情報も取得
                    if (c.proposalId) {
                        const proposalSnap = await getDoc(doc(db, "proposals", c.proposalId));
                        if (proposalSnap.exists()) {
                            const p = { id: proposalSnap.id, ...proposalSnap.data() } as Proposal;
                            setProposal(p);
                            setNegotiationPrice(p.price);
                        }
                    }
                }
                setLoading(false);
            }
        });

        return () => unsubProposal();
    }, [roomId, user, job]);

    // Ensure chat room exists
    useEffect(() => {
        if (!user) return;
        
        // For proposal-based room
        if (proposal) {
            const checkAndCreateRoom = async () => {
                try {
                    const roomRef = doc(db, "rooms", proposal.id);
                    const roomSnap = await getDoc(roomRef);
                    
                    if (!roomSnap.exists()) {
                        await setDoc(roomRef, {
                            participants: {
                                [proposal.clientId]: true,
                                [proposal.workerId]: true
                            },
                            createdAt: serverTimestamp(),
                            updatedAt: serverTimestamp()
                        });
                    }
                    setIsRoomReady(true);
                } catch (error) {
                    console.error("Error checking/creating room:", error);
                }
            };
            checkAndCreateRoom();
        }
        
        // For contract-based room (competition type)
        if (contract) {
            const checkAndCreateRoom = async () => {
                try {
                    const roomRef = doc(db, "rooms", contract.id);
                    const roomSnap = await getDoc(roomRef);
                    
                    if (!roomSnap.exists()) {
                        await setDoc(roomRef, {
                            participants: {
                                [contract.clientId]: true,
                                [contract.workerId]: true
                            },
                            createdAt: serverTimestamp(),
                            updatedAt: serverTimestamp()
                        });
                    }
                    setIsRoomReady(true);
                } catch (error) {
                    console.error("Error checking/creating room:", error);
                }
            };
            checkAndCreateRoom();
        }
    }, [proposal?.id, proposal?.clientId, proposal?.workerId, contract?.id, contract?.clientId, contract?.workerId, user]);

    const handleNegotiate = async () => {
        if (!proposal || !user) return;
        setIsNegotiating(true);
        try {
            await addNegotiationMessage(proposal.id, {
                senderId: user.uid,
                message: negotiationMessage || "条件変更の提案",
                price: negotiationPrice
            });
            setNegotiationMessage("");
            alert("条件を提示しました");
        } catch (error) {
            console.error("Error negotiating:", error);
            alert("エラーが発生しました");
        } finally {
            setIsNegotiating(false);
        }
    };

    const executeCreateContract = async () => {
        if (!proposal || !job || !user) return;
        
        setIsCreatingContract(true);
        setErrorMessage(null);

        // タイムアウト設定 (60秒 - Cloud Runのコールドスタート対応)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        try {
            console.log("Starting contract creation...", {
                proposalId: proposal.id,
                jobId: job.id,
                clientId: user.uid,
                workerId: proposal.workerId,
                price: proposal.price,
                title: job.title
            });

            const token = await auth.currentUser?.getIdToken();
            // Use Cloud Run direct URL to avoid domain mapping timeout issues
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
            const res = await fetch(`${apiUrl}/api/contracts/create`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    proposalId: proposal.id,
                    jobId: job.id,
                    clientId: user.uid,
                    workerId: proposal.workerId,
                    price: proposal.price,
                    title: job.title,
                }),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);

            if (!res.ok) {
                const errorText = await res.text();
                console.error("API Error Response:", res.status, errorText);
                try {
                    const errorJson = JSON.parse(errorText);
                    throw new Error(errorJson.error || `Server error: ${res.status}`);
                } catch (e) {
                    throw new Error(`Server error: ${res.status}`);
                }
            }

            const data = await res.json();
            console.log("API Response:", data);
            
            if (data.error) {
                console.error("Contract creation logic error:", data.error);
                setErrorMessage(data.error);
                setIsCreatingContract(false);
                return;
            }
            
            if (data.contractId) {
                console.log("Contract created/found:", data.contractId, "isExisting:", data.isExisting);
                // モーダルを閉じる
                setIsConfirmModalOpen(false);
                // 契約詳細ページへ遷移
                console.log("Navigating to:", `/client/contracts/${data.contractId}`);
                
                // 遷移前に少し待機して、状態更新を確実にする
                setTimeout(() => {
                    // router.pushだと遷移しない場合があるため、window.location.hrefを使用
                    window.location.href = `/client/contracts/${data.contractId}`;
                }, 500);
            } else {
                console.error("Unexpected response - no contractId:", data);
                setErrorMessage("予期しないエラーが発生しました。もう一度お試しください。");
                setIsCreatingContract(false);
            }
        } catch (err: any) {
            clearTimeout(timeoutId);
            console.error("Execute contract error:", err);
            
            if (err.name === 'AbortError') {
                setErrorMessage("通信がタイムアウトしました。もう一度お試しください。");
            } else {
                setErrorMessage(err.message || "エラーが発生しました。もう一度お試しください。");
            }
            setIsCreatingContract(false);
        }
    };

    if (loading) return <div className="p-8 text-center">読み込み中...</div>;
    if (!user) return <div className="p-8 text-center">ログインしてください</div>;
    
    // コンペ方式（契約ベースのルーム）の場合
    if (isContractRoom && contract && job) {
        const isClient = user.uid === contract.clientId;
        const partnerId = isClient ? contract.workerId : contract.clientId;
        
        return (
            <div className="container mx-auto px-4 py-4 h-[calc(100vh-64px)] flex flex-col">
                <div className="flex-none flex items-center mb-4">
                    <Button variant="ghost" onClick={() => router.back()} className="mr-4">
                        <ArrowLeft size={20} />
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold text-secondary flex items-center gap-2">
                            <span>契約に関するメッセージ</span>
                        </h1>
                        <p className="text-sm text-gray-500">案件: {contract.jobTitle || job.title}</p>
                    </div>
                </div>

                <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-hidden">
                    {/* Main Chat Area */}
                    <div className="flex-1 h-full min-h-0">
                        {isRoomReady ? (
                            <ChatBox roomId={roomId} currentUserId={user.uid} />
                        ) : (
                            <div className="flex items-center justify-center h-full bg-gray-50 rounded-xl border">
                                <p className="text-gray-500">チャットルームを準備中...</p>
                            </div>
                        )}
                    </div>

                    {/* Contract Info Panel (Sidebar) */}
                    <div className="hidden lg:block lg:w-1/3 h-full overflow-y-auto space-y-6 pb-4">
                        <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">現在の条件</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* デバッグ情報（一時的） */}
                            <div className="bg-yellow-50 p-2 text-xs border border-yellow-200 rounded mb-4">
                                <p><strong>Debug Info (v2):</strong></p>
                                <p>Status: {proposal?.status}</p>
                                <p>Contract ID: {contract?.id || 'None'}</p>
                                <p>User ID: {user.uid}</p>
                                <p>Is Client: {isClient ? 'Yes' : 'No'}</p>
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="mt-2 h-6 text-xs w-full"
                                    onClick={() => window.location.reload()}
                                >
                                    強制リロード
                                </Button>
                            </div>

                            {/* 契約一覧へのショートカット（常に表示または条件付き） */}
                            <div className="text-right">
                                <Button 
                                    variant="ghost" 
                                    className="text-xs text-gray-500 p-0 h-auto hover:bg-transparent hover:underline"
                                    onClick={() => router.push(isClient ? '/client/contracts' : '/worker/contracts')}
                                >
                                    契約一覧を見る &rarr;
                                </Button>
                            </div>

                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-2 text-gray-600">
                                    <DollarSign size={18} />
                                    <span className="text-sm font-medium">契約金額 (税抜)</span>
                                </div>
                                    <span className="text-lg font-bold text-secondary">
                                        {contract.amount.toLocaleString()}円
                                    </span>
                                </div>
                                
                                {/* 提案情報（コンペ方式で提案がある場合） */}
                                {proposal && (
                                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <Calendar size={18} />
                                            <span className="text-sm font-medium">完了予定</span>
                                        </div>
                                        <span className="text-base font-medium">
                                            {proposal.estimatedDuration}
                                        </span>
                                    </div>
                                )}
                                
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <Calendar size={18} />
                                        <span className="text-sm font-medium">ステータス</span>
                                    </div>
                                    <span className="text-base font-medium">
                                        {contract.status === 'waiting_for_escrow' ? '仮決済待ち' :
                                         contract.status === 'escrow' ? '仮決済済み' :
                                         contract.status === 'in_progress' ? '業務中' :
                                         contract.status === 'submitted' ? '納品済み' :
                                         contract.status === 'completed' ? '完了' : contract.status}
                                    </span>
                                </div>

                                {/* 提案メッセージ（コンペ方式で提案がある場合） */}
                                {proposal && proposal.message && (
                                    <div className="pt-4 border-t">
                                        <h3 className="text-sm font-bold mb-2">提案内容</h3>
                                        <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                                            {proposal.message}
                                        </p>
                                    </div>
                                )}

                                {/* Contract Status */}
                                <div className="pt-4 border-t">
                                    <div className="bg-green-50 text-green-800 p-3 rounded-lg text-center text-sm font-bold">
                                        <CheckCircle size={16} className="inline mr-1" />
                                        契約済み
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2 text-center">
                                        契約詳細は契約管理ページからご確認ください。
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        );
    }
    
    // 直接メッセージモードの場合
    if (isDirectMessage) {
        return (
            <div className="container mx-auto px-4 py-4 h-[calc(100vh-64px)] flex flex-col">
                <div className="flex-none flex items-center mb-4">
                    <Button variant="ghost" onClick={() => router.back()} className="mr-4">
                        <ArrowLeft size={20} />
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold text-secondary flex items-center gap-2">
                            <MessageSquare size={20} className="text-primary" />
                            <span 
                                className="cursor-pointer hover:text-primary hover:underline"
                                onClick={() => {
                                    if (partnerUser) {
                                        router.push(`/users/${partnerUser.uid}`);
                                    }
                                }}
                            >
                                {partnerUser?.displayName || '読み込み中...'}
                            </span>
                            <span>とのメッセージ</span>
                        </h1>
                        <p className="text-sm text-gray-500">直接メッセージ</p>
                    </div>
                </div>

                <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-hidden">
                    {/* Main Chat Area */}
                    <div className="flex-1 h-full min-h-0">
                        {isRoomReady ? (
                            <ChatBox roomId={roomId} currentUserId={user.uid} />
                        ) : (
                            <div className="flex items-center justify-center h-full bg-gray-50 rounded-xl border">
                                <p className="text-gray-500">チャットルームを準備中...</p>
                            </div>
                        )}
                    </div>

                    {/* User Info Panel (Sidebar) - Desktop only */}
                    <div className="hidden lg:block lg:w-1/3 h-full overflow-y-auto space-y-6 pb-4">
                        {partnerUser && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">相手の情報</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-2xl font-bold text-gray-500">
                                            {partnerUser.displayName?.charAt(0) || '?'}
                                        </div>
                                        <div>
                                            <p className="font-bold text-lg">{partnerUser.displayName}</p>
                                            {partnerUser.address?.prefecture && (
                                                <p className="text-sm text-gray-500">{partnerUser.address.prefecture}</p>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {partnerUser.workerProfile?.bio && (
                                        <div className="pt-4 border-t">
                                            <h3 className="text-sm font-bold mb-2">自己紹介</h3>
                                            <p className="text-sm text-gray-600 whitespace-pre-wrap">
                                                {partnerUser.workerProfile.bio}
                                            </p>
                                        </div>
                                    )}
                                    
                                    {partnerUser.workerProfile?.skills && partnerUser.workerProfile.skills.length > 0 && (
                                        <div className="pt-4 border-t">
                                            <h3 className="text-sm font-bold mb-2">スキル</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {partnerUser.workerProfile.skills.map((skill: string, i: number) => (
                                                    <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                                                        {skill}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    
                                    <div className="pt-4 border-t">
                                        <Button 
                                            variant="outline"
                                            className="w-full"
                                            onClick={() => router.push(`/users/${partnerUser.uid}`)}
                                        >
                                            プロフィールを見る
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                        
                        <Card>
                            <CardContent className="py-4">
                                <p className="text-xs text-gray-500 text-center">
                                    💡 案件に関するやり取りは、案件詳細ページからメッセージを送ることをお勧めします。
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        );
    }
    
    // プロジェクト方式（提案ベースのルーム）の場合
    if (!proposal || !job) return <div className="p-8 text-center">データが見つかりません</div>;

    const isClient = user.uid === job.clientId;
    const partnerName = isClient ? proposal.workerName : job.clientName;

    return (
        <div className="container mx-auto px-4 py-4 lg:h-[calc(100vh-64px)] h-auto flex flex-col">
            <div className="flex-none flex items-center mb-4">
                <Button variant="ghost" onClick={() => router.back()} className="mr-4">
                    <ArrowLeft size={20} />
                </Button>
                <div>
                    <h1 className="text-xl font-bold text-secondary flex items-center gap-2">
                        <span 
                            className="cursor-pointer hover:text-primary hover:underline"
                            onClick={() => {
                                const partnerId = isClient ? proposal.workerId : job.clientId;
                                router.push(`/users/${partnerId}`);
                            }}
                        >
                            {partnerName}
                        </span>
                        <span>とのメッセージ</span>
                    </h1>
                    <p className="text-sm text-gray-500">案件: {job.title}</p>
                </div>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
                {/* Main Chat Area */}
                <div className="lg:flex-1 lg:h-full h-[calc(100dvh-140px)] min-h-0">
                    {isRoomReady ? (
                        <ChatBox roomId={roomId} currentUserId={user.uid} />
                    ) : (
                        <div className="flex items-center justify-center h-full bg-gray-50 rounded-xl border">
                            <p className="text-gray-500">チャットルームを準備中...</p>
                        </div>
                    )}
                </div>

                {/* Condition Panel (Sidebar) */}
                <div className="lg:w-1/3 lg:h-full lg:overflow-y-auto space-y-6 pb-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">現在の条件</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-2 text-gray-600">
                                    <DollarSign size={18} />
                                    <span className="text-sm font-medium">契約金額 (税抜)</span>
                                </div>
                                <span className="text-lg font-bold text-secondary">
                                    {proposal.price.toLocaleString()}円
                                </span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-2 text-gray-600">
                                    <Calendar size={18} />
                                    <span className="text-sm font-medium">完了予定</span>
                                </div>
                                <span className="text-base font-medium">
                                    {proposal.estimatedDuration}
                                </span>
                            </div>

                            {/* Negotiation Actions */}
                            <div className="pt-4 border-t">
                                <h3 className="text-sm font-bold mb-3">条件変更・交渉</h3>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs text-gray-500 mb-1 block">金額変更</label>
                                        <Input 
                                            type="number" 
                                            value={negotiationPrice} 
                                            onChange={(e) => setNegotiationPrice(Number(e.target.value))}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 mb-1 block">メッセージ (任意)</label>
                                        <Input 
                                            value={negotiationMessage} 
                                            onChange={(e) => setNegotiationMessage(e.target.value)}
                                            placeholder="金額変更の理由など"
                                        />
                                    </div>
                                    <Button 
                                        onClick={handleNegotiate} 
                                        disabled={isNegotiating || (negotiationPrice === proposal.price && !negotiationMessage)}
                                        variant="outline"
                                        className="w-full"
                                    >
                                        条件変更を提示する
                                    </Button>
                                </div>
                            </div>

                            {/* Contract Action (Client Only) */}
                            {isClient && proposal.status !== 'hired' && proposal.status !== 'adopted' && (
                                <div className="pt-4 border-t">
                                    <Button 
                                        onClick={() => setIsConfirmModalOpen(true)} 
                                        className="w-full bg-accent hover:bg-accent/90 text-white"
                                    >
                                        <CheckCircle size={18} className="mr-2" />
                                        この条件で契約する
                                    </Button>
                                    <p className="text-xs text-gray-500 mt-2 text-center">
                                        契約を作成し、仮決済へ進みます。
                                    </p>
                                </div>
                            )}
                            
                            {/* Contract Exists (Both) */}
                            {/* 契約が存在するか、ステータスがhired/adoptedの場合に表示 */}
                            {/* 常に表示するように条件を緩和し、内部で出し分ける */}
                            <div className="pt-4 border-t space-y-3">
                                {(contract || proposal.status === 'hired' || proposal.status === 'adopted') ? (
                                    <div className={`p-4 rounded-lg text-center border ${
                                        contract?.status === 'waiting_for_escrow' 
                                            ? 'bg-yellow-50 text-yellow-800 border-yellow-200' 
                                            : 'bg-green-50 text-green-800 border-green-100'
                                    }`}>
                                        {/* ステータスに応じた表示 */}
                                        {contract?.status === 'waiting_for_escrow' ? (
                                            <>
                                                <div className="font-bold text-sm mb-2 flex items-center justify-center">
                                                    <CreditCard size={16} className="inline mr-1" />
                                                    仮決済待ち
                                                </div>
                                                {isClient ? (
                                                    <>
                                                        <p className="text-xs mb-3">
                                                            業務を開始するには、仮決済が必要です。
                                                        </p>
                                                        <Button 
                                                            onClick={() => {
                                                                router.push(`/client/contracts/${contract.id}`);
                                                            }}
                                                            className="w-full bg-accent hover:bg-accent/90 text-white text-sm h-9 shadow-sm"
                                                        >
                                                            仮決済へ進む
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <p className="text-xs mb-3">
                                                            クライアントの仮決済をお待ちください。
                                                        </p>
                                                        <Button 
                                                            onClick={() => {
                                                                router.push(`/worker/contracts/${contract.id}`);
                                                            }}
                                                            variant="outline"
                                                            className="w-full text-sm h-9"
                                                        >
                                                            契約詳細を確認する
                                                        </Button>
                                                    </>
                                                )}
                                            </>
                                        ) : contract?.status === 'pending_signature' ? (
                                            <>
                                                <div className="font-bold text-sm mb-2 flex items-center justify-center">
                                                    <Clock size={16} className="inline mr-1" />
                                                    契約合意待ち
                                                </div>
                                                <p className="text-xs mb-3">
                                                    {isClient ? 'ワーカーの合意をお待ちください。' : '契約内容を確認し、合意してください。'}
                                                </p>
                                                <Button 
                                                    onClick={() => {
                                                        router.push(isClient ? `/client/contracts/${contract.id}` : `/worker/contracts/${contract.id}`);
                                                    }}
                                                    className="w-full bg-orange-500 hover:bg-orange-600 text-white text-sm h-9 shadow-sm"
                                                >
                                                    契約詳細を確認する
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                <div className="font-bold text-sm mb-3 flex items-center justify-center">
                                                    <CheckCircle size={16} className="inline mr-1" />
                                                    {contract?.status === 'escrow' ? '仮決済済み' :
                                                     contract?.status === 'submitted' ? '納品済み' :
                                                     contract?.status === 'completed' ? '完了' : '契約済み'}
                                                </div>
                                                <Button 
                                                    onClick={() => {
                                                        if (contract) {
                                                            router.push(isClient ? `/client/contracts/${contract.id}` : `/worker/contracts/${contract.id}`);
                                                        } else {
                                                            router.push(isClient ? '/client/contracts' : '/worker/contracts');
                                                        }
                                                    }}
                                                    className="w-full bg-green-600 hover:bg-green-700 text-white text-sm h-9 shadow-sm"
                                                >
                                                    {contract ? "契約詳細へ移動する" : "契約一覧を確認する"}
                                                </Button>
                                            </>
                                        )}
                                        
                                    </div>
                                ) : (
                                    /* 契約前でもデバッグ用にボタンを表示（開発者用） */
                                    <div className="bg-gray-50 p-2 rounded text-center">
                                        <p className="text-xs text-gray-400 mb-2">ステータス: {proposal.status}</p>
                                        <Link href={isClient ? '/client/contracts' : '/worker/contracts'} className="w-full block">
                                            <Button 
                                                variant="outline"
                                                size="sm"
                                                className="w-full text-xs"
                                            >
                                                契約一覧を見る
                                            </Button>
                                        </Link>
                                    </div>
                                )}
                                
                                <p className="text-xs text-gray-500 text-center">
                                    {isClient ? "仮決済や検収はこちらから" : "業務開始や納品はこちらから"}
                                </p>

                            </div>
                            
                            {/* エラー表示エリア（デバッグ用） */}
                            {errorMessage && (
                                <div className="mt-4 p-2 bg-red-50 text-red-600 text-xs rounded break-all">
                                    Error: {errorMessage}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Negotiation History */}
                    {proposal.negotiationHistory && proposal.negotiationHistory.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">交渉履歴</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                                    {proposal.negotiationHistory.map((hist, i) => (
                                        <div key={i} className="text-sm border-b pb-2 last:border-0">
                                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                                                <span>{hist.senderId === user.uid ? "あなた" : partnerName}</span>
                                                <span>{hist.createdAt?.seconds ? new Date(hist.createdAt.seconds * 1000).toLocaleDateString() : ""}</span>
                                            </div>
                                            <div className="font-medium">
                                                {hist.price?.toLocaleString()}円
                                            </div>
                                            <div className="text-gray-600 text-xs">
                                                {hist.message}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            <Modal
                isOpen={isConfirmModalOpen}
                onClose={() => {
                    setIsConfirmModalOpen(false);
                    setErrorMessage(null);
                }}
                title="契約オファーの確認"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => {
                            setIsConfirmModalOpen(false);
                            setErrorMessage(null);
                        }} disabled={isCreatingContract}>
                            キャンセル
                        </Button>
                        <Button onClick={executeCreateContract} disabled={isCreatingContract} className="bg-accent hover:bg-accent/90 text-white">
                            {isCreatingContract ? "送信中..." : "オファーを送信する"}
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    {errorMessage && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium">
                            {errorMessage}
                        </div>
                    )}
                    <p className="text-gray-600">
                        現在の条件で契約オファーを送信しますか？<br />
                        ワーカーが合意すると契約が成立します。
                    </p>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">契約金額 (税抜)</span>
                            <span className="font-bold">{proposal.price.toLocaleString()}円</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">完了予定</span>
                            <span className="font-medium">{proposal.estimatedDuration}</span>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
