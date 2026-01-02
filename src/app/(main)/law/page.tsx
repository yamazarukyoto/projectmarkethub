import React from "react";

export default function LawPage() {
    return (
        <div className="container mx-auto px-4 py-12 max-w-4xl">
            <h1 className="text-3xl font-bold mb-8 text-secondary">特定商取引法に基づく表記</h1>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <tbody>
                        <tr className="border-b border-gray-100">
                            <th className="py-4 px-6 bg-gray-50 font-semibold text-secondary">サイトURL</th>
                            <td className="py-4 px-6 text-text-body">
                                <a href="https://pj-markethub.com/" className="text-primary hover:underline">
                                    https://pj-markethub.com/
                                </a>
                            </td>
                        </tr>
                        <tr className="border-b border-gray-100">
                            <th className="py-4 px-6 bg-gray-50 font-semibold text-secondary">所在地</th>
                            <td className="py-4 px-6 text-text-body">〒600-8208 京都府京都市下京区小稲荷町85-2 Grand-K 京都駅前ビル 201</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                            <th className="py-4 px-6 bg-gray-50 font-semibold text-secondary">連絡先メールアドレス</th>
                            <td className="py-4 px-6 text-text-body">service@pj-markethub.com</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                            <th className="py-4 px-6 bg-gray-50 font-semibold text-secondary">電話番号</th>
                            <td className="py-4 px-6 text-text-body">請求があった場合、遅滞なく開示します。</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                            <th className="py-4 px-6 bg-gray-50 font-semibold text-secondary">販売事業者</th>
                            <td className="py-4 px-6 text-text-body">山本健太</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                            <th className="py-4 px-6 bg-gray-50 font-semibold text-secondary">運営責任者</th>
                            <td className="py-4 px-6 text-text-body">山本健太</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                            <th className="py-4 px-6 bg-gray-50 font-semibold text-secondary">販売価格</th>
                            <td className="py-4 px-6 text-text-body">各商品・サービスのご購入ページにて表示する価格</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                            <th className="py-4 px-6 bg-gray-50 font-semibold text-secondary">商品代金以外の必要料金</th>
                            <td className="py-4 px-6 text-text-body">インターネット接続料金、通信料金等はお客様の負担となります。</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                            <th className="py-4 px-6 bg-gray-50 font-semibold text-secondary">支払方法</th>
                            <td className="py-4 px-6 text-text-body">クレジットカード決済 (Stripe)、銀行振込</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                            <th className="py-4 px-6 bg-gray-50 font-semibold text-secondary">支払時期</th>
                            <td className="py-4 px-6 text-text-body">
                                契約締結時に決済予約（与信確保）を行い、検収完了時に決済確定します。
                            </td>
                        </tr>
                        <tr className="border-b border-gray-100">
                            <th className="py-4 px-6 bg-gray-50 font-semibold text-secondary">引渡し時期</th>
                            <td className="py-4 px-6 text-text-body">決済完了後、即時（サービス利用開始）</td>
                        </tr>
                        <tr>
                            <th className="py-4 px-6 bg-gray-50 font-semibold text-secondary">返品・交換・キャンセル</th>
                            <td className="py-4 px-6 text-text-body">
                                デジタルコンテンツの性質上、原則として返品・返金には応じられません。<br />
                                ただし、当社の責めに帰すべき事由によりサービスが提供されなかった場合はこの限りではありません。<br />
                                契約キャンセル時の返金については利用規約に準じます。
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
