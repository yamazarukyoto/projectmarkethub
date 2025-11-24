"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { getWorkerProposals, getJob } from "@/lib/db";
import { db } from "@/lib/firebase";
import { deleteDoc, doc } from "firebase/firestore";
import { Job, Proposal } from "@/types";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CheckCircle, XCircle, AlertCircle, Trash2 } from "lucide-react";

type Application = Proposal & { job?: Job };

export default function WorkerApplicationsPage() {
    const { user } = useAuth();
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchApplications = async () => {
            if (user) {
                const proposals = await getWorkerProposals(user.uid);
                const appsWithJobs = await Promise.all(
                    proposals.map(async (p) => {
                        const job = await getJob(p.jobId);
                        return { ...p, job: job || undefined };
                    })
                );
                setApplications(appsWithJobs);
            }
            setLoading(false);
        };
        fetchApplications();
    }, [user]);

    const handleDelete = async (applicationId: string) => {
        if (!confirm("本当にこの応募を辞退（削除）しますか？この操作は取り消せません。")) {
            return;
        }

        try {
            await deleteDoc(doc(db, "proposals", applicationId));
            setApplications(applications.filter((app) => app.id !== applicationId));
            alert("応募を削除しました。");
        } catch (error) {
            console.error("Error deleting application:", error);
            alert("削除に失敗しました。");
        }
    };

    if (loading) return <div className="p-8 text-center">読み込み中...</div>;

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold text-secondary mb-6">応募管理</h1>

            {applications.length === 0 ? (
                <Card>
                    <CardContent className="p-8 text-center">
                        <p className="text-gray-500 mb-4">まだ応募した案件はありません。</p>
                        <Link href="/worker/search">
                            <Button>仕事を探す</Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {applications.map((app) => (
                        <Card key={app.id}>
                            <CardContent className="p-6">
                                <div className="flex flex-col md:flex-row justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${app.status === 'hired' ? 'bg-green-100 text-green-800' :
                                                    app.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                        'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {app.status === 'hired' ? <CheckCircle size={12} /> :
                                                    app.status === 'rejected' ? <XCircle size={12} /> :
                                                        <AlertCircle size={12} />}
                                                {app.status === 'hired' ? '採用' :
                                                    app.status === 'rejected' ? '不採用' : '選考中'}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                応募日: {app.createdAt.toDate().toLocaleDateString()}
                                            </span>
                                        </div>

                                        <h3 className="text-lg font-bold mb-1">
                                            <Link href={`/worker/jobs/${app.jobId}`} className="hover:underline text-primary">
                                                {app.job?.title || "案件が見つかりません"}
                                            </Link>
                                        </h3>
                                        <p className="text-sm text-gray-600 mb-2">
                                            提案金額: {app.price.toLocaleString()}円 • 完了予定: {app.estimatedDuration}
                                        </p>
                                        <p className="text-sm text-gray-500 line-clamp-2">{app.message}</p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Link href={`/worker/jobs/${app.jobId}`}>
                                            <Button variant="outline" size="sm">詳細を見る</Button>
                                        </Link>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="text-danger hover:bg-red-50 hover:text-danger"
                                            onClick={() => handleDelete(app.id)}
                                        >
                                            <Trash2 size={16} />
                                            辞退
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
