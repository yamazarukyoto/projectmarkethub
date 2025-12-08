"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { ChatBox } from "@/components/features/message/ChatBox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getJob, getProposal, addNegotiationMessage } from "@/lib/db";
import { Job, Proposal } from "@/types";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ArrowLeft, DollarSign, Calendar, CheckCircle } from "lucide-react";

export default function MessageRoomPage() {
    const params = useParams();
    const router = useRouter();
    const roomId = params.roomId as string; // roomId is proposalId
    const { user } = useAuth();
    
    const [proposal, setProposal] = useState<Proposal | null>(null);
    const [job, setJob] = useState<Job | null>(null);
    const [loading, setLoading] = useState(true);
    const [negotiationPrice, setNegotiationPrice] = useState<number>(0);
    const [negotiationMessage, setNegotiationMessage] = useState("");
    const [isNegotiating, setIsNegotiating] = useState(false);

    useEffect(() => {
        if (!roomId || !user) return;

        // Real-time listener for proposal (conditions)
        const unsub = onSnapshot(doc(db, "proposals", roomId), async (docSnap) => {
            if (docSnap.exists()) {
                const p = { id: docSnap.id, ...docSnap.data() } as Proposal;
                setProposal(p);
                setNegotiationPrice(p.price);

                // Fetch job if not already fetched
                if (!job) {
                    const j = await getJob(p.jobId);
                    setJob(j);
                }
            }
            setLoading(false);
        });

        return () => unsub();
    }, [roomId, user, job]);

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

    const handleCreateContract = async () => {
        if (!proposal || !job || !user) return;
        if (!confirm("現在の条件で契約を作成しますか？")) return;

        try {
            const res = await fetch("/api/contracts/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    proposalId: proposal.id,
                    jobId: job.id,
                    clientId: user.uid,
                    workerId: proposal.workerId,
                    price: proposal.price,
                    title: job.title,
                }),
            });
            const data = await res.json();
            if (data.error) {
                alert(data.error);
            } else {
                alert("契約が作成されました。");
                router.push(`/client/contracts/${data.contractId}`);
            }
        } catch (err) {
            console.error(err);
            alert("エラーが発生しました");
        }
    };

    if (loading) return <div className="p-8 text-center">読み込み中...</div>;
    if (!user) return <div className="p-8 text-center">ログインしてください</div>;
    if (!proposal || !job) return <div className="p-8 text-center">データが見つかりません</div>;

    const isClient = user.uid === job.clientId;
    const partnerName = isClient ? proposal.workerName : job.clientName;

    return (
        <div className="container mx-auto px-4 py-8 h-[calc(100vh-64px)]">
            <div className="flex items-center mb-4">
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                {/* Main Chat Area */}
                <div className="lg:col-span-2 h-full">
                    <ChatBox roomId={roomId} currentUserId={user.uid} />
                </div>

                {/* Condition Panel (Sidebar) */}
                <div className="space-y-6">
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
                                        disabled={isNegotiating || negotiationPrice === proposal.price}
                                        variant="outline"
                                        className="w-full"
                                    >
                                        条件変更を提示する
                                    </Button>
                                </div>
                            </div>

                            {/* Contract Action (Client Only) */}
                            {isClient && (
                                <div className="pt-4 border-t">
                                    <Button 
                                        onClick={handleCreateContract} 
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
        </div>
    );
}
