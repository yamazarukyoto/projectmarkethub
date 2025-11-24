"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, deleteDoc, doc, orderBy } from "firebase/firestore";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Plus, Trash2, Eye, Calendar, DollarSign } from "lucide-react";
import { Job } from "@/types";

export default function ClientJobsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchJobs = async () => {
            if (!user) return;

            try {
                const q = query(
                    collection(db, "jobs"),
                    where("clientId", "==", user.uid),
                    orderBy("createdAt", "desc")
                );
                const querySnapshot = await getDocs(q);
                const jobsData = querySnapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Job[];
                setJobs(jobsData);
            } catch (error) {
                console.error("Error fetching jobs:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchJobs();
    }, [user]);

    const handleDelete = async (jobId: string) => {
        if (!confirm("本当にこの依頼を削除しますか？この操作は取り消せません。")) {
            return;
        }

        try {
            await deleteDoc(doc(db, "jobs", jobId));
            setJobs(jobs.filter((job) => job.id !== jobId));
            alert("依頼を削除しました。");
        } catch (error) {
            console.error("Error deleting job:", error);
            alert("削除に失敗しました。");
        }
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            open: "bg-blue-100 text-blue-800",
            selecting: "bg-purple-100 text-purple-800",
            closed: "bg-gray-100 text-gray-800",
            filled: "bg-green-100 text-green-800",
            cancelled: "bg-red-100 text-red-800",
        };
        const labels = {
            open: "募集中",
            selecting: "選定中",
            closed: "終了",
            filled: "契約済",
            cancelled: "キャンセル",
        };
        
        const statusKey = status as keyof typeof styles;
        
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[statusKey] || "bg-gray-100 text-gray-800"}`}>
                {labels[statusKey] || status}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="container mx-auto px-4">
                    <div className="animate-pulse space-y-4">
                        <div className="h-8 bg-gray-200 w-1/4 rounded"></div>
                        <div className="h-64 bg-gray-200 rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="container mx-auto px-4">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">依頼した仕事</h1>
                    <Link href="/client/jobs/new">
                        <Button className="flex items-center gap-2">
                            <Plus size={16} />
                            新しい仕事を依頼
                        </Button>
                    </Link>
                </div>

                {jobs.length === 0 ? (
                    <Card className="p-12 text-center">
                        <div className="text-gray-500 mb-4">まだ依頼した仕事はありません</div>
                        <Link href="/client/jobs/new">
                            <Button variant="outline">初めての仕事を依頼する</Button>
                        </Link>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {jobs.map((job) => (
                            <Card key={job.id} className="p-6 hover:shadow-md transition-shadow">
                                <div className="flex flex-col md:flex-row justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            {getStatusBadge(job.status)}
                                            <span className="text-sm text-gray-500">
                                                {new Date(job.createdAt.seconds * 1000).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900 mb-2">
                                            <Link href={`/client/jobs/${job.id}`} className="hover:text-primary hover:underline">
                                                {job.title}
                                            </Link>
                                        </h3>
                                        <div className="flex items-center gap-4 text-sm text-gray-600">
                                            <div className="flex items-center gap-1">
                                                <DollarSign size={14} />
                                                <span>¥{job.budget?.toLocaleString()}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Calendar size={14} />
                                                <span>期限: {new Date(job.deadline.seconds * 1000).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 md:self-center">
                                        <Link href={`/client/jobs/${job.id}`}>
                                            <Button variant="outline" size="sm" className="flex items-center gap-1">
                                                <Eye size={14} />
                                                詳細
                                            </Button>
                                        </Link>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="text-danger hover:bg-red-50 hover:text-danger"
                                            onClick={() => handleDelete(job.id)}
                                        >
                                            <Trash2 size={14} />
                                            削除
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
