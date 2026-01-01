"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Plus, Briefcase, Users, Clock } from "lucide-react";
import { getJobs } from "@/lib/db";
import { Job } from "@/types";

export default function ClientDashboard() {
    const { user, firebaseUser } = useAuth();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'open' | 'filled' | 'closed'>('all');

    useEffect(() => {
        const fetchJobs = async () => {
            try {
                // In a real app, we would filter by client ID
                // For now, just fetching all jobs to demonstrate
                const allJobs = await getJobs();
                setJobs(allJobs.filter(job => job.clientId === user?.uid));
            } catch (error) {
                console.error("Error fetching jobs:", error);
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchJobs();
        }
    }, [user]);

    const filteredJobs = jobs.filter(job => {
        if (filter === 'all') return true;
        return job.status === filter;
    });

    const getStatusBadge = (job: Job) => {
        let label = "";
        let style = "";

        if (job.status === 'open') {
            if (job.proposalCount > 0) {
                label = "選定中";
                style = "bg-purple-100 text-purple-800";
            } else {
                label = "募集中";
                style = "bg-blue-100 text-blue-800";
            }
        } else if (job.status === 'filled') {
            label = "契約済";
            style = "bg-green-100 text-green-800";
        } else if (job.status === 'closed') {
            label = "終了";
            style = "bg-gray-100 text-gray-800";
        } else if (job.status === 'cancelled') {
            label = "キャンセル";
            style = "bg-red-100 text-red-800";
        } else {
            label = job.status;
            style = "bg-gray-100 text-gray-800";
        }
        
        return (
            <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${style}`}>
                {label}
            </span>
        );
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-secondary">ダッシュボード</h1>
                    <p className="text-gray-600">ようこそ、{user?.displayName || firebaseUser?.displayName || 'ゲスト'}さん</p>
                </div>
                <Link href="/client/jobs/new">
                    <Button className="flex items-center gap-2">
                        <Plus size={20} />
                        新しい仕事を依頼
                    </Button>
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('open')}>
                    <CardContent className={`p-6 flex items-center gap-4 ${filter === 'open' ? 'ring-2 ring-primary ring-offset-2 rounded-xl' : ''}`}>
                        <div className="p-3 bg-primary/10 rounded-full text-primary">
                            <Briefcase size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">募集中</p>
                            <p className="text-2xl font-bold">{jobs.filter(j => j.status === 'open').length}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('filled')}>
                    <CardContent className={`p-6 flex items-center gap-4 ${filter === 'filled' ? 'ring-2 ring-accent ring-offset-2 rounded-xl' : ''}`}>
                        <div className="p-3 bg-accent/10 rounded-full text-accent">
                            <Clock size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">契約中</p>
                            <p className="text-2xl font-bold">{jobs.filter(j => j.status === 'filled').length}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('closed')}>
                    <CardContent className={`p-6 flex items-center gap-4 ${filter === 'closed' ? 'ring-2 ring-secondary ring-offset-2 rounded-xl' : ''}`}>
                        <div className="p-3 bg-secondary/10 rounded-full text-secondary">
                            <Users size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">完了</p>
                            <p className="text-2xl font-bold">{jobs.filter(j => j.status === 'closed').length}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
                <h2 className="text-xl font-bold text-secondary">依頼管理</h2>
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
                        variant={filter === 'open' ? 'primary' : 'ghost'} 
                        size="sm" 
                        onClick={() => setFilter('open')}
                        className="whitespace-nowrap"
                    >
                        募集中
                    </Button>
                    <Button 
                        variant={filter === 'filled' ? 'primary' : 'ghost'} 
                        size="sm" 
                        onClick={() => setFilter('filled')}
                        className="whitespace-nowrap"
                    >
                        契約中
                    </Button>
                    <Button 
                        variant={filter === 'closed' ? 'primary' : 'ghost'} 
                        size="sm" 
                        onClick={() => setFilter('closed')}
                        className="whitespace-nowrap"
                    >
                        完了
                    </Button>
                </div>
            </div>

            {loading ? (
                <p>読み込み中...</p>
            ) : filteredJobs.length > 0 ? (
                <div className="grid gap-4">
                    {filteredJobs.map((job) => (
                        <Link key={job.id} href={`/client/jobs/${job.id}`}>
                            <Card className="hover:shadow-md transition-shadow cursor-pointer">
                                <CardContent className="p-6">
                                    <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                        <div>
                                            <h3 className="text-lg font-bold mb-2">{job.title}</h3>
                                            <p className="text-sm text-gray-500 mb-2">
                                                予算: {job.budget.toLocaleString()}円
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {job.tags.map(tag => (
                                                    <span key={tag} className="px-2 py-1 bg-gray-100 text-xs rounded text-gray-600 whitespace-nowrap">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex flex-row md:flex-col items-center md:items-end gap-2 w-full md:w-auto justify-between md:justify-start">
                                            {getStatusBadge(job)}
                                            <span className="text-xs text-gray-400 whitespace-nowrap">
                                                {job.createdAt.toDate().toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            ) : (
                <Card className="bg-gray-50 border-dashed">
                    <CardContent className="p-12 text-center">
                        <p className="text-gray-500 mb-4">該当する依頼はありません。</p>
                        {filter === 'all' && (
                            <Link href="/client/jobs/new">
                                <Button variant="outline">仕事を依頼する</Button>
                            </Link>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
