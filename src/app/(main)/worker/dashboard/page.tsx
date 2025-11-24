"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Search, Briefcase, FileText, DollarSign, CheckCircle, XCircle, AlertCircle, Trash2 } from "lucide-react";
import { getJobs, getWorkerProposals, getJob } from "@/lib/db";
import { db } from "@/lib/firebase";
import { deleteDoc, doc } from "firebase/firestore";
import { Job, Proposal } from "@/types";

type Application = Proposal & { job?: Job };

export default function WorkerDashboard() {
    const { user } = useAuth();
    const [recentJobs, setRecentJobs] = useState<Job[]>([]);
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'hired' | 'rejected'>('all');

    useEffect(() => {
        const fetchData = async () => {
            if (user) {
                try {
                    // Fetch recent jobs
                    const jobs = await getJobs();
                    setRecentJobs(jobs.slice(0, 3));

                    // Fetch applications
                    const proposals = await getWorkerProposals(user.uid);
                    const appsWithJobs = await Promise.all(
                        proposals.map(async (p) => {
                            const job = await getJob(p.jobId);
                            return { ...p, job: job || undefined };
                        })
                    );
                    setApplications(appsWithJobs);
                } catch (error) {
                    console.error("Error fetching worker dashboard data:", error);
                }
            }
            setLoading(false);
        };
        fetchData();
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

    const filteredApplications = applications.filter(app => {
        if (filter === 'all') return true;
        return app.status === filter;
    });

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-secondary">ダッシュボード</h1>
                    <p className="text-gray-600">ようこそ、{user?.displayName}さん</p>
                </div>
                <Link href="/worker/search">
                    <Button className="flex items-center gap-2">
                        <Search size={20} />
                        仕事を探す
                    </Button>
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('pending')}>
                    <CardContent className={`p-6 flex items-center gap-4 ${filter === 'pending' ? 'ring-2 ring-primary ring-offset-2 rounded-xl' : ''}`}>
                        <div className="p-3 bg-primary/10 rounded-full text-primary">
                            <FileText size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">選考中</p>
                            <p className="text-2xl font-bold">{applications.filter(a => a.status === 'pending' || a.status === 'interviewing').length}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('hired')}>
                    <CardContent className={`p-6 flex items-center gap-4 ${filter === 'hired' ? 'ring-2 ring-accent ring-offset-2 rounded-xl' : ''}`}>
                        <div className="p-3 bg-accent/10 rounded-full text-accent">
                            <Briefcase size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">採用済み</p>
                            <p className="text-2xl font-bold">{applications.filter(a => a.status === 'hired' || a.status === 'adopted').length}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-secondary/10 rounded-full text-secondary">
                            <DollarSign size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">今月の報酬</p>
                            <p className="text-2xl font-bold">¥0</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-secondary">応募管理</h2>
                <div className="flex gap-2">
                    <Button 
                        variant={filter === 'all' ? 'primary' : 'ghost'} 
                        size="sm" 
                        onClick={() => setFilter('all')}
                    >
                        すべて
                    </Button>
                    <Button 
                        variant={filter === 'pending' ? 'primary' : 'ghost'} 
                        size="sm" 
                        onClick={() => setFilter('pending')}
                    >
                        選考中
                    </Button>
                    <Button 
                        variant={filter === 'hired' ? 'primary' : 'ghost'} 
                        size="sm" 
                        onClick={() => setFilter('hired')}
                    >
                        採用済み
                    </Button>
                    <Button 
                        variant={filter === 'rejected' ? 'primary' : 'ghost'} 
                        size="sm" 
                        onClick={() => setFilter('rejected')}
                    >
                        不採用
                    </Button>
                </div>
            </div>

            {loading ? (
                <p>読み込み中...</p>
            ) : filteredApplications.length > 0 ? (
                <div className="space-y-4 mb-12">
                    {filteredApplications.map((app) => (
                        <Card key={app.id}>
                            <CardContent className="p-6">
                                <div className="flex flex-col md:flex-row justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${
                                                app.status === 'hired' || app.status === 'adopted' ? 'bg-green-100 text-green-800' :
                                                app.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                'bg-yellow-100 text-yellow-800'
                                            }`}>
                                                {app.status === 'hired' || app.status === 'adopted' ? <CheckCircle size={12} /> :
                                                 app.status === 'rejected' ? <XCircle size={12} /> :
                                                 <AlertCircle size={12} />}
                                                {app.status === 'hired' || app.status === 'adopted' ? '採用' :
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
            ) : (
                <Card className="bg-gray-50 border-dashed mb-12">
                    <CardContent className="p-12 text-center">
                        <p className="text-gray-500 mb-4">該当する応募はありません。</p>
                        {filter === 'all' && (
                            <Link href="/worker/search">
                                <Button>仕事を探す</Button>
                            </Link>
                        )}
                    </CardContent>
                </Card>
            )}

            <h2 className="text-xl font-bold text-secondary mb-4">新着の仕事</h2>
            {loading ? (
                <p>読み込み中...</p>
            ) : (
                <div className="grid gap-4">
                    {recentJobs.map((job) => (
                        <Card key={job.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-lg font-bold mb-2">{job.title}</h3>
                                        <p className="text-sm text-gray-500 mb-2">
                                            {job.clientName} • {job.budget.toLocaleString()}円
                                        </p>
                                        <div className="flex gap-2">
                                            {job.tags.map(tag => (
                                                <span key={tag} className="px-2 py-1 bg-gray-100 text-xs rounded text-gray-600">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <Link href={`/worker/jobs/${job.id}`}>
                                        <Button variant="outline" size="sm">詳細を見る</Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
