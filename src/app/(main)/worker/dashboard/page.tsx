"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Search, Briefcase, FileText, DollarSign, CheckCircle, XCircle, AlertCircle, Clock, FileSignature, ArrowRight } from "lucide-react";
import { getWorkerProposals, getJob, getContracts } from "@/lib/db";
import { Job, Proposal, Contract } from "@/types";

type Application = Proposal & { job?: Job };

export default function WorkerDashboard() {
    const { user, firebaseUser } = useAuth();
    const [applications, setApplications] = useState<Application[]>([]);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (user) {
                try {
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

    // 最新3件のみ表示
    const recentContracts = contracts.slice(0, 3);
    const recentApplications = applications.slice(0, 3);

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

            {/* 統計カード */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card>
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-full text-primary">
                            <FileText size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">選考中</p>
                            <p className="text-2xl font-bold">{applications.filter(a => a.status === 'pending' || a.status === 'interviewing').length}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-accent/10 rounded-full text-accent">
                            <Briefcase size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">進行中の契約</p>
                            <p className="text-2xl font-bold">{contracts.filter(c => c.status !== 'completed' && c.status !== 'cancelled').length}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-secondary/10 rounded-full text-secondary">
                            <DollarSign size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">完了した契約</p>
                            <p className="text-2xl font-bold">{contracts.filter(c => c.status === 'completed').length}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 契約管理セクション */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-secondary flex items-center gap-2">
                        <FileSignature size={24} />
                        契約管理
                    </h2>
                    <Link href="/worker/contracts">
                        <Button variant="outline" size="sm" className="flex items-center gap-1">
                            契約一覧を見る
                            <ArrowRight size={16} />
                        </Button>
                    </Link>
                </div>
                
                {loading ? (
                    <p>読み込み中...</p>
                ) : recentContracts.length > 0 ? (
                    <div className="space-y-4">
                        {recentContracts.map((contract) => {
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
                        {contracts.length > 3 && (
                            <div className="text-center">
                                <Link href="/worker/contracts">
                                    <Button variant="ghost" className="text-primary">
                                        他 {contracts.length - 3} 件の契約を見る →
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </div>
                ) : (
                    <Card className="bg-gray-50 border-dashed">
                        <CardContent className="p-8 text-center">
                            <p className="text-gray-500">契約はまだありません。</p>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* 応募管理セクション */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-secondary flex items-center gap-2">
                        <FileText size={24} />
                        応募管理
                    </h2>
                    <Link href="/worker/applications">
                        <Button variant="outline" size="sm" className="flex items-center gap-1">
                            応募一覧を見る
                            <ArrowRight size={16} />
                        </Button>
                    </Link>
                </div>

                {loading ? (
                    <p>読み込み中...</p>
                ) : recentApplications.length > 0 ? (
                    <div className="space-y-4">
                        {recentApplications.map((app) => (
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
                                        </div>

                                        <div className="flex items-center gap-2 mt-4 md:mt-0 w-full md:w-auto justify-end">
                                            <Link href={`/worker/jobs/${app.jobId}`}>
                                                <Button variant="outline" size="sm" className="whitespace-nowrap">詳細を見る</Button>
                                            </Link>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        {applications.length > 3 && (
                            <div className="text-center">
                                <Link href="/worker/applications">
                                    <Button variant="ghost" className="text-primary">
                                        他 {applications.length - 3} 件の応募を見る →
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </div>
                ) : (
                    <Card className="bg-gray-50 border-dashed">
                        <CardContent className="p-8 text-center">
                            <p className="text-gray-500 mb-4">まだ応募した案件はありません。</p>
                            <Link href="/worker/search">
                                <Button>仕事を探す</Button>
                            </Link>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
