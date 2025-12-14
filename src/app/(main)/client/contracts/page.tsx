"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { getContracts } from "@/lib/db";
import { Contract } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FileText, Clock, CheckCircle, AlertCircle } from "lucide-react";

export default function ClientContractsPage() {
    const { user } = useAuth();
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchContracts = async () => {
            if (user) {
                try {
                    const data = await getContracts(user.uid, 'client');
                    setContracts(data);
                } catch (error) {
                    console.error("Error fetching contracts:", error);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchContracts();
    }, [user]);

    if (loading) return <div className="p-8 text-center">読み込み中...</div>;

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold text-secondary mb-6">契約管理</h1>

            {contracts.length === 0 ? (
                <Card>
                    <CardContent className="p-8 text-center text-gray-500">
                        契約はまだありません。
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {contracts.map((contract) => (
                        <Link key={contract.id} href={`/client/contracts/${contract.id}`}>
                            <Card className="hover:shadow-md transition-shadow cursor-pointer">
                                <CardContent className="p-6">
                                    <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                        <div>
                                            <h3 className="text-lg font-bold mb-1">{contract.jobTitle}</h3>
                                            <p className="text-sm text-gray-500 mb-2">
                                                契約日: {contract.createdAt.toDate().toLocaleDateString()}
                                            </p>
                                            <div className="flex items-center gap-4 text-sm">
                                                <span className="font-medium">
                                                    {contract.amount.toLocaleString()}円
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {contract.status === 'waiting_for_escrow' && (
                                                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium flex items-center gap-1">
                                                    <AlertCircle size={14} /> 仮決済待ち
                                                </span>
                                            )}
                                            {contract.status === 'escrow' && (
                                                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium flex items-center gap-1">
                                                    <Clock size={14} /> 業務開始待ち
                                                </span>
                                            )}
                                            {contract.status === 'in_progress' && (
                                                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium flex items-center gap-1">
                                                    <FileText size={14} /> 業務中
                                                </span>
                                            )}
                                            {contract.status === 'submitted' && (
                                                <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium flex items-center gap-1">
                                                    <FileText size={14} /> 検収待ち
                                                </span>
                                            )}
                                            {contract.status === 'completed' && (
                                                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium flex items-center gap-1">
                                                    <CheckCircle size={14} /> 完了
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
