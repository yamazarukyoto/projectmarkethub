"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    itemsPerPage: number;
    totalItems: number;
    onPageChange: (page: number) => void;
    onItemsPerPageChange: (itemsPerPage: number) => void;
    itemsPerPageOptions?: number[];
}

export function Pagination({
    currentPage,
    totalPages,
    itemsPerPage,
    totalItems,
    onPageChange,
    onItemsPerPageChange,
    itemsPerPageOptions = [10, 50, 100],
}: PaginationProps) {
    // ページ番号の配列を生成（最大5ページ表示）
    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxVisiblePages = 5;

        if (totalPages <= maxVisiblePages) {
            // 全ページ表示
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // 省略表示
            if (currentPage <= 3) {
                // 先頭付近
                for (let i = 1; i <= 4; i++) {
                    pages.push(i);
                }
                pages.push("...");
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 2) {
                // 末尾付近
                pages.push(1);
                pages.push("...");
                for (let i = totalPages - 3; i <= totalPages; i++) {
                    pages.push(i);
                }
            } else {
                // 中間
                pages.push(1);
                pages.push("...");
                pages.push(currentPage - 1);
                pages.push(currentPage);
                pages.push(currentPage + 1);
                pages.push("...");
                pages.push(totalPages);
            }
        }

        return pages;
    };

    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 py-4 border-t border-gray-200">
            {/* 表示件数選択 */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>表示件数:</span>
                <select
                    value={itemsPerPage}
                    onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
                    className="rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-primary focus:ring-primary"
                >
                    {itemsPerPageOptions.map((option) => (
                        <option key={option} value={option}>
                            {option}件
                        </option>
                    ))}
                </select>
                <span className="text-gray-500">
                    （{startItem}-{endItem} / 全{totalItems}件）
                </span>
            </div>

            {/* ページネーションボタン */}
            {totalPages > 1 && (
                <div className="flex items-center gap-1">
                    {/* 前へボタン */}
                    <button
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`p-2 rounded-lg transition-colors ${
                            currentPage === 1
                                ? "text-gray-300 cursor-not-allowed"
                                : "text-gray-600 hover:bg-gray-100"
                        }`}
                        aria-label="前のページ"
                    >
                        <ChevronLeft size={20} />
                    </button>

                    {/* ページ番号 */}
                    {getPageNumbers().map((page, index) => (
                        <React.Fragment key={index}>
                            {page === "..." ? (
                                <span className="px-2 py-1 text-gray-400">...</span>
                            ) : (
                                <button
                                    onClick={() => onPageChange(page as number)}
                                    className={`min-w-[36px] h-9 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                        currentPage === page
                                            ? "bg-primary text-white"
                                            : "text-gray-600 hover:bg-gray-100"
                                    }`}
                                >
                                    {page}
                                </button>
                            )}
                        </React.Fragment>
                    ))}

                    {/* 次へボタン */}
                    <button
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`p-2 rounded-lg transition-colors ${
                            currentPage === totalPages
                                ? "text-gray-300 cursor-not-allowed"
                                : "text-gray-600 hover:bg-gray-100"
                        }`}
                        aria-label="次のページ"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            )}
        </div>
    );
}
