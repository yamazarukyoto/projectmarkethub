"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { Search, Filter } from "lucide-react";
import { getJobs } from "@/lib/db";
import { Job } from "@/types";

export default function JobSearchPage() {
    const [allJobs, setAllJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    
    // 検索条件
    const [keyword, setKeyword] = useState("");
    const [category, setCategory] = useState("");
    const [minBudget, setMinBudget] = useState("");
    const [maxBudget, setMaxBudget] = useState("");

    // ページネーション
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // 全案件を取得
    useEffect(() => {
        const fetchJobs = async () => {
            setLoading(true);
            const fetchedJobs = await getJobs();
            setAllJobs(fetchedJobs);
            setLoading(false);
        };
        fetchJobs();
    }, []);

    // フィルタリングされた案件
    const filteredJobs = useMemo(() => {
        return allJobs.filter(job => {
            // 募集中の案件のみ表示（契約済み・終了案件は非表示）
            if (job.status !== 'open') {
                return false;
            }

            // カテゴリーフィルター
            if (category && job.category !== category) {
                return false;
            }

            // キーワード検索（タイトルと説明文）
            if (keyword) {
                const lowerKeyword = keyword.toLowerCase();
                const titleMatch = job.title.toLowerCase().includes(lowerKeyword);
                const descMatch = job.description.toLowerCase().includes(lowerKeyword);
                const tagMatch = job.tags?.some(tag => tag.toLowerCase().includes(lowerKeyword));
                if (!titleMatch && !descMatch && !tagMatch) {
                    return false;
                }
            }

            // 最小予算フィルター
            if (minBudget) {
                const min = parseInt(minBudget, 10);
                if (!isNaN(min) && job.budget < min) {
                    return false;
                }
            }

            // 最大予算フィルター
            if (maxBudget) {
                const max = parseInt(maxBudget, 10);
                if (!isNaN(max) && job.budget > max) {
                    return false;
                }
            }

            return true;
        });
    }, [allJobs, keyword, category, minBudget, maxBudget]);

    // ページネーション計算
    const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);
    const paginatedJobs = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return filteredJobs.slice(startIndex, endIndex);
    }, [filteredJobs, currentPage, itemsPerPage]);

    // フィルター変更時にページをリセット
    useEffect(() => {
        setCurrentPage(1);
    }, [keyword, category, minBudget, maxBudget, itemsPerPage]);

    // 検索条件をクリア
    const clearFilters = () => {
        setKeyword("");
        setCategory("");
        setMinBudget("");
        setMaxBudget("");
        setCurrentPage(1);
    };

    // ページ変更ハンドラー
    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        // ページ上部にスクロール
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // 表示件数変更ハンドラー
    const handleItemsPerPageChange = (newItemsPerPage: number) => {
        setItemsPerPage(newItemsPerPage);
        setCurrentPage(1);
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar Filters */}
                <div className="w-full md:w-72 space-y-6">
                    <Card>
                        <CardContent className="p-4">
                            <h3 className="font-bold mb-4 flex items-center gap-2">
                                <Filter size={16} /> 検索条件
                            </h3>

                            <div className="space-y-4">
                                {/* キーワード検索 */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        キーワード
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm pl-9"
                                            placeholder="タイトル、説明文、タグで検索"
                                            value={keyword}
                                            onChange={(e) => setKeyword(e.target.value)}
                                        />
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                                    </div>
                                </div>

                                {/* カテゴリー */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        カテゴリー
                                    </label>
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

                                {/* 予算範囲 */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        予算範囲
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                            placeholder="最小"
                                            value={minBudget}
                                            onChange={(e) => setMinBudget(e.target.value)}
                                            min="0"
                                        />
                                        <span className="text-gray-500">〜</span>
                                        <input
                                            type="number"
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                            placeholder="最大"
                                            value={maxBudget}
                                            onChange={(e) => setMaxBudget(e.target.value)}
                                            min="0"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">単位: 円</p>
                                </div>

                                {/* クリアボタン */}
                                <button
                                    onClick={clearFilters}
                                    className="w-full text-sm text-primary hover:underline"
                                >
                                    検索条件をクリア
                                </button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content */}
                <div className="flex-1">
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-secondary mb-2">仕事を探す</h1>
                        <p className="text-gray-600">
                            {loading ? "読み込み中..." : `${filteredJobs.length}件の案件が見つかりました`}
                        </p>
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : filteredJobs.length === 0 ? (
                        <Card>
                            <CardContent className="p-8 text-center">
                                <p className="text-gray-500 mb-4">条件に一致する案件が見つかりませんでした</p>
                                <button
                                    onClick={clearFilters}
                                    className="text-primary hover:underline"
                                >
                                    検索条件をクリアして再検索
                                </button>
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                            <div className="space-y-4">
                                {paginatedJobs.map((job) => (
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
                                                        {job.tags?.map(tag => (
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

                            {/* ページネーション */}
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                itemsPerPage={itemsPerPage}
                                totalItems={filteredJobs.length}
                                onPageChange={handlePageChange}
                                onItemsPerPageChange={handleItemsPerPageChange}
                            />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
