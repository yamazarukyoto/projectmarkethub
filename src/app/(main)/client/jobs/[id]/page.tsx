"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { getJob, getProposals } from "@/lib/db";
import { db } from "@/lib/firebase";
import { deleteDoc, doc } from "firebase/firestore";
import { Job, Proposal } from "@/types";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ArrowLeft, Clock, DollarSign, Calendar, Tag, Trash2, Paperclip, Download } from "lucide-react";

export default function ClientJobDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const [job, setJob] = useState<Job | null>(null);
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                if (params.id) {
                    const jobId = params.id as string;
                    const jobData = await getJob(jobId);
                    setJob(jobData);

                    if (jobData && jobData.clientId === user?.uid) {
                        const proposalsData = await getProposals(jobId);
                        setProposals(proposalsData);
                    }
                }
            } catch (error) {
                console.error("Error fetching job details:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [params.id, user]);

    const handleDelete = async () => {
        if (!job || !confirm("本当にこの依頼を削除しますか？この操作は取り消せません。")) return;

        try {
            await deleteDoc(doc(db, "jobs", job.id));
            alert("依頼を削除しました。");
            router.push("/client/dashboard");
        } catch (error) {
            console.error("Error deleting job:", error);
            alert("削除に失敗しました。");
        }
    };

    if (loading) return <div className="p-8 text-center">読み込み中...</div>;
    if (!job) return <div className="p-8 text-center">案件が見つかりません</div>;

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-4">
                <Button variant="ghost" className="pl-0" onClick={() => router.back()}>
                    <ArrowLeft size={20} className="mr-2" />
                    戻る
                </Button>
                {job.status === 'open' && (
                    <Button variant="ghost" className="text-danger hover:bg-red-50 hover:text-danger" onClick={handleDelete}>
                        <Trash2 size={20} className="mr-2" />
                        依頼を削除
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Job Details */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-2xl font-bold text-secondary">{job.title}</CardTitle>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${job.status === 'open' ? 'bg-green-100 text-green-800' :
                                    job.status === 'filled' ? 'bg-blue-100 text-blue-800' :
                                        'bg-gray-100 text-gray-800'
                                    }`}>
                                    {job.status === 'open' ? '募集中' :
                                        job.status === 'filled' ? '契約中' : '終了'}
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                    <DollarSign size={16} />
                                    <span>予算: {job.budget.toLocaleString()}円 (固定報酬)</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Calendar size={16} />
                                    <span>期限: {job.deadline.toDate().toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Clock size={16} />
                                    <span>掲載日: {job.createdAt.toDate().toLocaleDateString()}</span>
                                </div>
                            </div>

                            <div className="prose max-w-none">
                                <h3 className="text-lg font-semibold mb-2">依頼詳細</h3>
                                <p className="whitespace-pre-wrap text-gray-700">{job.description}</p>
                            </div>

                            <div>
                                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                    <Tag size={16} /> 関連タグ
                                </h3>
                                <div className="flex gap-2">
                                    {job.tags.map(tag => (
                                        <span key={tag} className="px-2 py-1 bg-gray-100 text-xs rounded text-gray-600">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {job.attachments && job.attachments.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                        <Paperclip size={16} /> 添付ファイル
                                    </h3>
                                    <div className="space-y-2">
                                        {job.attachments.map((url, index) => (
                                            <a 
                                                key={index} 
                                                href={url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors text-sm text-primary"
                                            >
                                                <Download size={14} />
                                                <span>添付ファイル {index + 1}</span>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Proposals (Only visible to client) */}
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-secondary">応募一覧 ({proposals.length})</h2>
                    {proposals.length > 0 ? (
                        <div className="space-y-4">
                            {proposals.map(proposal => (
                                <Card key={proposal.id}>
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                                                {proposal.workerPhotoURL ? (
                                                    <img src={proposal.workerPhotoURL} alt={proposal.workerName} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full bg-gray-300" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-medium">{proposal.workerName}</p>
                                                <p className="text-xs text-gray-500">{proposal.createdAt.toDate().toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="mb-3">
                                            <p className="text-sm font-medium">提案金額: {proposal.price.toLocaleString()}円</p>
                                            <p className="text-sm text-gray-500">完了予定: {proposal.estimatedDuration}</p>
                                        </div>
                                        <p className="text-sm text-gray-700 line-clamp-3 mb-3">{proposal.message}</p>
                                        <div className="flex gap-2">
                                            <Button size="sm" variant="outline" className="flex-1">詳細を確認</Button>
                                            {job.status === 'open' && (
                                                <Button
                                                    size="sm"
                                                    className="flex-1"
                                                    onClick={async () => {
                                                        if (!confirm("この提案を採用して契約に進みますか？")) return;
                                                        try {
                                                            const res = await fetch("/api/contracts/create", {
                                                                method: "POST",
                                                                headers: { "Content-Type": "application/json" },
                                                                body: JSON.stringify({
                                                                    proposalId: proposal.id,
                                                                    jobId: job.id,
                                                                    clientId: user?.uid,
                                                                    workerId: proposal.workerId,
                                                                    price: proposal.price,
                                                                    title: job.title,
                                                                }),
                                                            });
                                                            const data = await res.json();
                                                            if (data.error) {
                                                                alert(data.error);
                                                            } else {
                                                                alert("契約が作成されました。仮払いへ進みます。");
                                                                // Redirect to payment page
                                                                router.push(`/client/contracts/payment?clientSecret=${data.clientSecret}`);
                                                            }
                                                        } catch (err) {
                                                            console.error(err);
                                                            alert("エラーが発生しました");
                                                        }
                                                    }}
                                                >
                                                    採用する
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <Card>
                            <CardContent className="p-8 text-center text-gray-500">
                                まだ応募はありません
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
