"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { Search, Filter } from "lucide-react";
import { getJobs } from "@/lib/db";
import { Job } from "@/types";

export default function JobSearchPage() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [category, setCategory] = useState("");

    useEffect(() => {
        const fetchJobs = async () => {
            setLoading(true);
            const fetchedJobs = await getJobs(category || undefined);
            setJobs(fetchedJobs);
            setLoading(false);
        };
        fetchJobs();
    }, [category]);

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar Filters */}
                <div className="w-full md:w-64 space-y-6">
                    <Card>
                        <CardContent className="p-4">
                            <h3 className="font-bold mb-4 flex items-center gap-2">
                                <Filter size={16} /> 検索条件
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリー</label>
                                    <select
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                    >
                                        <option value="">すべて</option>
                                        <option value="web_dev">Web開発</option>
                                        <option value="design">デザイン</option>
                                        <option value="writing">ライティング</option>
                                        <option value="video">動画編集</option>
                                        <option value="other">その他</option>
                                    </select>
                                </div>

                                {/* Add more filters here */}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content */}
                <div className="flex-1">
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-secondary mb-2">仕事を探す</h1>
                        <p className="text-gray-600">{jobs.length}件の案件が見つかりました</p>
                    </div>

                    {loading ? (
                        <p>読み込み中...</p>
                    ) : (
                        <div className="space-y-4">
                            {jobs.map((job) => (
                                <Card key={job.id} className="hover:shadow-md transition-shadow">
                                    <CardContent className="p-6">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <h3 className="text-lg font-bold mb-2 text-primary hover:underline">
                                                    <Link href={`/worker/jobs/${job.id}`}>{job.title}</Link>
                                                </h3>
                                                <p className="text-sm text-gray-500 mb-4 line-clamp-2">{job.description}</p>

                                                <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
                                                    <span className="flex items-center gap-1">
                                                        <span className="font-medium">予算:</span> {job.budget.toLocaleString()}円
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <span className="font-medium">期限:</span> {job.deadline.toDate().toLocaleDateString()}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <span className="font-medium">クライアント:</span>
                                                        <Link href={`/users/${job.clientId}`} className="text-primary hover:underline">
                                                            {job.clientName}
                                                        </Link>
                                                    </span>
                                                </div>

                                                <div className="flex gap-2">
                                                    {job.tags.map(tag => (
                                                        <span key={tag} className="px-2 py-1 bg-gray-100 text-xs rounded text-gray-600">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="ml-4">
                                                <Link href={`/worker/jobs/${job.id}`}>
                                                    <Button>詳細を見る</Button>
                                                </Link>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
