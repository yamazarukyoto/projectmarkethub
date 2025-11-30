"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { Search, Filter, Star, Briefcase } from "lucide-react";
import { getWorkers } from "@/lib/db";
import { User } from "@/types";

export default function WorkerSearchPage() {
    const [workers, setWorkers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [skillFilter, setSkillFilter] = useState("");

    useEffect(() => {
        const fetchWorkers = async () => {
            setLoading(true);
            try {
                const fetchedWorkers = await getWorkers(skillFilter || undefined);
                setWorkers(fetchedWorkers);
            } catch (error) {
                console.error("Error fetching workers:", error);
            } finally {
                setLoading(false);
            }
        };
        
        // Debounce search
        const timer = setTimeout(() => {
            fetchWorkers();
        }, 500);

        return () => clearTimeout(timer);
    }, [skillFilter]);

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
                                    <label className="block text-sm font-medium text-gray-700 mb-1">スキル</label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                                        <Input 
                                            className="pl-9" 
                                            placeholder="例: React, Python" 
                                            value={skillFilter}
                                            onChange={(e) => setSkillFilter(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content */}
                <div className="flex-1">
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-secondary mb-2">ワーカーを探す</h1>
                        <p className="text-gray-600">{workers.length}名のワーカーが見つかりました</p>
                    </div>

                    {loading ? (
                        <p>読み込み中...</p>
                    ) : (
                        <div className="space-y-4">
                            {workers.map((worker) => (
                                <Card key={worker.uid} className="hover:shadow-md transition-shadow">
                                    <CardContent className="p-6">
                                        <div className="flex flex-col sm:flex-row gap-4 items-start">
                                            <div className="w-16 h-16 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                                                {worker.photoURL ? (
                                                    <img src={worker.photoURL} alt={worker.displayName} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full bg-gray-300 flex items-center justify-center text-gray-500 text-xl">
                                                        {worker.displayName?.charAt(0) || "U"}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h3 className="text-lg font-bold text-primary hover:underline">
                                                            <Link href={`/users/${worker.uid}`}>{worker.displayName}</Link>
                                                        </h3>
                                                        <p className="text-sm text-gray-600 font-medium mb-1">{worker.workerProfile?.title}</p>
                                                    </div>
                                                    <Link href={`/users/${worker.uid}`}>
                                                        <Button size="sm" variant="outline">詳細を見る</Button>
                                                    </Link>
                                                </div>

                                                <p className="text-sm text-gray-500 mb-3 line-clamp-2">{worker.workerProfile?.bio}</p>

                                                <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                                                    <span className="flex items-center gap-1">
                                                        <Star size={14} className="text-yellow-500" />
                                                        <span className="font-medium">{worker.rating?.toFixed(1) || "0.0"}</span>
                                                        <span className="text-xs text-gray-400">({worker.reviewCount || 0})</span>
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Briefcase size={14} />
                                                        <span>実績: {worker.jobsCompleted || 0}件</span>
                                                    </span>
                                                </div>

                                                <div className="flex flex-wrap gap-2">
                                                    {worker.workerProfile?.skills?.map((skill, index) => (
                                                        <span key={index} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                                                            {skill}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                            
                            {workers.length === 0 && (
                                <div className="text-center py-12 bg-gray-50 rounded-lg">
                                    <p className="text-gray-500">条件に一致するワーカーは見つかりませんでした。</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
