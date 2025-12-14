"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Search, Briefcase, FileText, DollarSign, CheckCircle, XCircle, AlertCircle, Trash2, Clock, FileSignature } from "lucide-react";
import { getJobs, getWorkerProposals, getJob, getContracts } from "@/lib/db";
import { db } from "@/lib/firebase";
import { deleteDoc, doc } from "firebase/firestore";
import { Job, Proposal, Contract } from "@/types";

type Application = Proposal & { job?: Job };

export default function WorkerDashboard() {
    const { user, firebaseUser } = useAuth();
    const [recentJobs, setRecentJobs] = useState<Job[]>([]);
    const [applications, setApplications] = useState<Application[]>([]);
    const [contracts, setContracts] = useState<Contract[]>([]);
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

                    // Fetch contracts for worker
                    const workerContracts = await getContracts(user.uid, 'worker');
                    setContracts(workerContracts);
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
                    <p className="text-gray-600">ようこそ、{user?.displayName || firebaseUser?.displayName || 'ゲスト'}さん</p>
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

            {/* 契約管理セクション */}
            {contracts.length > 0 && (
                <div className="mb-12">
                    <h2 className="text-xl font-bold text-secondary mb-4 flex items-center gap-2">
                        <FileSignature size={24} />
                        契約管理
                    </h2>
                    <div className="space-y-4">
                        {contracts.map((contract) => {
                            const getStatusBadge = () => {
                                switch (contract.status) {
                                    case 'pending_signature':
                                        return { bg: 'bg-orange-100', text: 'text-orange-800', label: '署名待ち', icon: <Clock size={12} /> };
                                    case 'waiting_for_escrow':
                                        return { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '仮払い待ち', icon: <Clock size={12} /> };
                                    case 'escrow':
                                        return { bg: 'bg-blue-100', text: 'text-blue-800', label: '仮払い済み', icon: <DollarSign size={12} /> };
                                    case 'in_progress':
                                        return { bg: 'bg-purple-100', text: 'text-purple-800', label: '作業中', icon: <Briefcase size={12} /> };
                                    case 'submitted':
                                        return { bg: 'bg-indigo-100', text: 'text-indigo-800', label: '納品済み', icon: <FileText size={12} /> };
                                    case 'completed':
                                        return { bg: 'bg-green-100', text: 'text-green-800', label: '完了', icon: <CheckCircle size={12} /> };
                                    default:
                                        return { bg: 'bg-gray-100', text: 'text-gray-800', label: contract.status, icon: null };
                                }
                            };
                            const badge = getStatusBadge();
                            
                            return (
                                <Card key={contract.id} className={contract.status === 'pending_signature' ? 'border-orange-300 border-2' : ''}>
                                    <CardContent className="p-6">
                                        <div className="flex flex-col md:flex-row justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                                    <span className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 whitespace-nowrap ${badge.bg} ${badge.text}`}>
                                                        {badge.icon}
                                                        {badge.label}
                                                    </span>
                                                    <span className="text-xs text-gray-500 whitespace-nowrap">
                                                        契約日: {contract.createdAt.toDate().toLocaleDateString()}
                                                    </span>
                                                </div>

                                                <h3 className="text-lg font-bold mb-1">
                                                    <Link href={`/worker/contracts/${contract.id}`} className="hover:underline text-primary">
                                                        {contract.jobTitle}
                                                    </Link>
                                                </h3>
                                                <p className="text-sm text-gray-600 mb-2">
                                                    報酬: {contract.amount.toLocaleString()}円
                                                </p>
                                                {contract.status === 'pending_signature' && (
                                                    <p className="text-sm text-orange-600 font-medium">
                                                        ⚠️ クライアントが契約を作成しました。契約内容を確認して合意してください。
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2 mt-4 md:mt-0 w-full md:w-auto justify-end">
                                                <Link href={`/worker/contracts/${contract.id}`}>
                                                    <Button 
                                                        variant={contract.status === 'pending_signature' ? 'primary' : 'outline'} 
                                                        size="sm" 
                                                        className="whitespace-nowrap"
                                                    >
                                                        {contract.status === 'pending_signature' ? '契約を確認する' : '詳細を見る'}
                                                    </Button>
                                                </Link>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
                <h2 className="text-xl font-bold text-secondary">応募管理</h2>
                <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 whitespace-nowrap">
                    <Button 
                        variant={filter === 'all' ? 'primary' : 'ghost'} 
                        size="sm" 
                        onClick={() => setFilter('all')}
                        className="whitespace-nowrap"
                    >
                        すべて
                    </Button>
                    <Button 
                        variant={filter === 'pending' ? 'primary' : 'ghost'} 
                        size="sm" 
                        onClick={() => setFilter('pending')}
                        className="whitespace-nowrap"
                    >
                        選考中
                    </Button>
                    <Button 
                        variant={filter === 'hired' ? 'primary' : 'ghost'} 
                        size="sm" 
                        onClick={() => setFilter('hired')}
                        className="whitespace-nowrap"
                    >
                        採用済み
                    </Button>
                    <Button 
                        variant={filter === 'rejected' ? 'primary' : 'ghost'} 
                        size="sm" 
                        onClick={() => setFilter('rejected')}
                        className="whitespace-nowrap"
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
                                        <div className="flex flex-wrap items-center gap-2 mb-2">
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 whitespace-nowrap ${
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
                                            <span className="text-xs text-gray-500 whitespace-nowrap">
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

                                    <div className="flex items-center gap-2 mt-4 md:mt-0 w-full md:w-auto justify-end">
                                        <Link href={`/worker/jobs/${app.jobId}`}>
                                            <Button variant="outline" size="sm" className="whitespace-nowrap">詳細を見る</Button>
                                        </Link>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="text-danger hover:bg-red-50 hover:text-danger whitespace-nowrap"
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
                                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                    <div>
                                        <h3 className="text-lg font-bold mb-2">{job.title}</h3>
                                        <p className="text-sm text-gray-500 mb-2">
                                            {job.clientName} • {job.budget.toLocaleString()}円
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {job.tags.map(tag => (
                                                <span key={tag} className="px-2 py-1 bg-gray-100 text-xs rounded text-gray-600 whitespace-nowrap">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="w-full md:w-auto flex justify-end">
                                        <Link href={`/worker/jobs/${job.id}`}>
                                            <Button variant="outline" size="sm" className="whitespace-nowrap">詳細を見る</Button>
                                        </Link>
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
