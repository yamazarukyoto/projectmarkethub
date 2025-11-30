"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { getJob, getProposals, getTaskSubmissionsByJob, reviewTaskSubmission } from "@/lib/db";
import { db, auth } from "@/lib/firebase";
import { deleteDoc, doc } from "firebase/firestore";
import { Job, Proposal, TaskSubmission } from "@/types";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ArrowLeft, Clock, DollarSign, Calendar, Tag, Trash2, Paperclip, Download, CheckCircle, XCircle } from "lucide-react";

export default function ClientJobDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const [job, setJob] = useState<Job | null>(null);
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [taskSubmissions, setTaskSubmissions] = useState<TaskSubmission[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                if (params.id) {
                    const jobId = params.id as string;
                    const jobData = await getJob(jobId);
                    setJob(jobData);

                    if (jobData && jobData.clientId === user?.uid) {
                        if (jobData.type === 'task') {
                            const submissions = await getTaskSubmissionsByJob(jobId);
                            setTaskSubmissions(submissions);
                        } else {
                            const proposalsData = await getProposals(jobId);
                            setProposals(proposalsData);
                        }
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

    const handleTaskReview = async (submissionId: string, status: 'approved' | 'rejected') => {
        if (!confirm(`${status === 'approved' ? '承認' : '非承認'}しますか？`)) return;
        
        try {
            if (status === 'approved') {
                const token = await auth.currentUser?.getIdToken();
                const res = await fetch("/api/tasks/approve", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ submissionId }),
                });
                const data = await res.json();
                if (data.error) throw new Error(data.error);
                
                if (data.skipped) {
                    alert("承認しました。（支払いはデモモードです）");
                } else {
                    alert("承認し、支払いを実行しました。");
                }
            } else {
                await reviewTaskSubmission(submissionId, status);
                alert("非承認にしました。");
            }
            
            setTaskSubmissions(prev => prev.map(s => s.id === submissionId ? { ...s, status } : s));
        } catch (error) {
            console.error("Error reviewing task:", error);
            alert("エラーが発生しました");
        }
    };

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
                            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                <CardTitle className="text-2xl font-bold text-secondary">{job.title}</CardTitle>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${job.status === 'open' ? 'bg-green-100 text-green-800' :
                                    job.status === 'filled' ? 'bg-blue-100 text-blue-800' :
                                        'bg-gray-100 text-gray-800'
                                    }`}>
                                    {job.status === 'open' ? '募集中' :
                                        job.status === 'filled' ? '契約中' : '終了'}
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex flex-col sm:flex-row flex-wrap gap-4 text-sm text-gray-600">
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
                                <div className="flex flex-wrap gap-2">
                                    {job.tags.map(tag => (
                                        <span key={tag} className="px-2 py-1 bg-gray-100 text-xs rounded text-gray-600 whitespace-nowrap">
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

                {/* Proposals or Task Submissions (Only visible to client) */}
                <div className="space-y-6">
                    {job.type === 'task' ? (
                        <>
                            <h2 className="text-xl font-bold text-secondary">提出一覧 ({taskSubmissions.length})</h2>
                            {taskSubmissions.length > 0 ? (
                                <div className="space-y-4">
                                    {taskSubmissions.map(submission => (
                                        <Card key={submission.id}>
                                            <CardContent className="p-4">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <p className="text-xs text-gray-500 mb-1">
                                                            提出日: {submission.submittedAt?.toDate().toLocaleString()}
                                                        </p>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                                submission.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                                submission.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                                'bg-yellow-100 text-yellow-800'
                                                            }`}>
                                                                {submission.status === 'approved' ? '承認済み' :
                                                                 submission.status === 'rejected' ? '非承認' : '承認待ち'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-2 mb-4 bg-gray-50 p-3 rounded">
                                                    {submission.answers.map((ans, i) => (
                                                        <div key={i}>
                                                            <p className="text-xs font-bold text-gray-700">Q. {job.task?.questions.find(q => q.id === ans.questionId)?.text || `設問 ${i+1}`}</p>
                                                            <p className="text-sm text-gray-900">{Array.isArray(ans.value) ? ans.value.join(", ") : ans.value}</p>
                                                        </div>
                                                    ))}
                                                </div>

                                                {submission.status === 'pending' && (
                                                    <div className="flex gap-2">
                                                        <Button 
                                                            size="sm" 
                                                            className="flex-1 bg-green-600 hover:bg-green-700"
                                                            onClick={() => handleTaskReview(submission.id, 'approved')}
                                                        >
                                                            <CheckCircle size={16} className="mr-2" /> 承認
                                                        </Button>
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline"
                                                            className="flex-1 text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                                                            onClick={() => handleTaskReview(submission.id, 'rejected')}
                                                        >
                                                            <XCircle size={16} className="mr-2" /> 非承認
                                                        </Button>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <Card>
                                    <CardContent className="p-8 text-center text-gray-500">
                                        まだ提出はありません
                                    </CardContent>
                                </Card>
                            )}
                        </>
                    ) : (
                        <>
                            <h2 className="text-xl font-bold text-secondary">応募一覧 ({proposals.length})</h2>
                            {proposals.length > 0 ? (
                                <div className="space-y-4">
                                    {proposals.map(proposal => (
                                        <Card key={proposal.id}>
                                            <CardContent className="p-4">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div 
                                                        className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden cursor-pointer hover:opacity-80"
                                                        onClick={() => router.push(`/users/${proposal.workerId}`)}
                                                    >
                                                        {proposal.workerPhotoURL ? (
                                                            <img src={proposal.workerPhotoURL} alt={proposal.workerName} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full bg-gray-300" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p 
                                                            className="font-medium cursor-pointer hover:text-primary hover:underline"
                                                            onClick={() => router.push(`/users/${proposal.workerId}`)}
                                                        >
                                                            {proposal.workerName}
                                                        </p>
                                                        <p className="text-xs text-gray-500">{proposal.createdAt.toDate().toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                <div className="mb-3">
                                                    <p className="text-sm font-medium">提案金額: {proposal.price.toLocaleString()}円</p>
                                                    <p className="text-sm text-gray-500">完了予定: {proposal.estimatedDuration}</p>
                                                </div>
                                                <p className="text-sm text-gray-700 line-clamp-3 mb-3">{proposal.message}</p>
                                                <div className="flex flex-col sm:flex-row gap-2">
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline" 
                                                        className="flex-1 whitespace-nowrap"
                                                        onClick={() => router.push(`/messages/${proposal.id}`)}
                                                    >
                                                        詳細・交渉
                                                    </Button>
                                                    {job.status === 'open' && (
                                                        <Button
                                                            size="sm"
                                                            className="flex-1 whitespace-nowrap"
                                                            onClick={async () => {
                                                                if (!confirm("この提案を採用して契約に進みますか？")) return;
                                                                try {
                                                                    const token = await auth.currentUser?.getIdToken();
                                                                    const res = await fetch("/api/contracts/create", {
                                                                        method: "POST",
                                                                        headers: { 
                                                                            "Content-Type": "application/json",
                                                                            Authorization: `Bearer ${token}`,
                                                                        },
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
                                                                        // Redirect to contract detail page
                                                                        router.push(`/client/contracts/${data.contractId}`);
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
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
