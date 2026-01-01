import React from "react";
import Link from "next/link";

export const Footer = () => {
    return (
        <footer className="bg-secondary text-white py-12">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div>
                        <h3 className="text-lg font-bold mb-4">Project Market Hub</h3>
                        <p className="text-sm text-gray-300">
                            信頼できるプロフェッショナルと出会える<br />
                            クラウドソーシングプラットフォーム
                        </p>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-4">サービス</h4>
                        <ul className="space-y-2 text-sm text-gray-300">
                            <li><Link href="/worker/search" className="hover:text-white">仕事を探す</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-4">企業情報</h4>
                        <ul className="space-y-2 text-sm text-gray-300">
                            <li><Link href="/terms" className="hover:text-white">利用規約</Link></li>
                            <li><Link href="/privacy" className="hover:text-white">プライバシーポリシー</Link></li>
                            <li><Link href="/law" className="hover:text-white">特定商取引法に基づく表記</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-4">お問い合わせ</h4>
                        <p className="text-sm text-gray-300 mb-2">
                            service@pj-markethub.com
                        </p>
                        <div className="flex gap-4 mt-4">
                            {/* Social Icons could go here */}
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-700 mt-8 pt-8 text-center text-sm text-gray-400">
                    {new Date().getFullYear()} Project Market Hub. All rights reserved.
                </div>
            </div>
        </footer>
    );
};
