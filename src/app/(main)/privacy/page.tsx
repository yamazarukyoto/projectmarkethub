import React from "react";

export default function PrivacyPage() {
    return (
        <div className="container mx-auto px-4 py-12 max-w-4xl">
            <h1 className="text-3xl font-bold mb-8 text-secondary">プライバシーポリシー</h1>

            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 space-y-8 text-text-body">
                <p>
                    Project Market Hub運営事務局（以下「当運営」といいます。）は、本サービスの運営において、個人情報保護を重要な社会的使命・責務と認識し、以下の通りプライバシーポリシーを定めます。
                </p>

                <section>
                    <h2 className="text-xl font-bold mb-4 text-secondary border-b pb-2">1. 個人情報</h2>
                    <p className="mb-2">当運営が取得する個人情報とは、個人の識別に係る以下の情報をいいます。</p>
                    <ul className="list-disc list-inside space-y-2 ml-2">
                        <li>住所・氏名・電話番号・電子メールアドレス、クレジットカード情報、ログインID、パスワード、ニックネーム、IPアドレス等において、特定の個人を識別できる情報（他の情報と照合することができ、それにより特定の個人を識別することができることとなるものを含む。）</li>
                        <li>本サービスにおいて、お客様がご利用になったサービスの内容、ご利用日時、ご利用回数などのご利用内容及びご利用履歴に関する情報</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-4 text-secondary border-b pb-2">2. 個人情報の取得・収集について</h2>
                    <p className="mb-2">当運営は、以下の方法により、個人情報を取得させていただきます。</p>
                    <ol className="list-decimal list-inside space-y-4 ml-2">
                        <li>
                            <strong>本サービスを通じて取得・収集させていただく方法</strong>
                            <p className="ml-6 mt-1 text-gray-600">本サービスにおいて、お客様自ら入力された個人情報を取得します。</p>
                        </li>
                        <li>
                            <strong>電子メール、郵便、書面、電話等の手段により取得・収集させていただく方法</strong>
                            <p className="ml-6 mt-1 text-gray-600">お客様からのお問い合わせ等によりご提供いただいた個人情報を取得します。</p>
                        </li>
                        <li>
                            <strong>本サービスへアクセスされた際に情報を収集させていただく方法</strong>
                            <p className="ml-6 mt-1 text-gray-600">利用されるURL、ブラウザやデバイスの種類、IPアドレス、Cookie等の情報を収集します。</p>
                        </li>
                    </ol>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-4 text-secondary border-b pb-2">3. 個人情報の取得・利用目的</h2>
                    <p className="mb-2">当運営は、以下の目的のため、個人情報を適法かつ公正な手段で取得・利用させていただきます。</p>
                    <ol className="list-decimal list-inside space-y-2 ml-2">
                        <li>本サービスを提供するため</li>
                        <li>本サービスを安心・安全にご利用いただける環境整備のため</li>
                        <li>本サービスの運営・管理のため</li>
                        <li>本サービスに関するご案内、お問い合せ等への対応のため</li>
                        <li>本サービスの改善、研究開発のため</li>
                        <li>当運営とお客様の間での必要な連絡を行うため</li>
                        <li>本サービスに関する規約、ポリシー等に違反する行為に対する対応のため</li>
                        <li>本サービスに関する規約等の変更などを通知するため</li>
                        <li>その他当運営とお客様との間で同意した目的のため</li>
                    </ol>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-4 text-secondary border-b pb-2">4. 個人情報の管理</h2>
                    <p>
                        当運営は、個人情報の滅失、き損、漏洩及び不正利用等を防止し、その安全管理を行うために必要な措置を講じ、個人情報を安全に管理します。また、個人情報を利用目的の範囲内において、正確かつ最新の状態で管理するように努めます。
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-4 text-secondary border-b pb-2">5. 個人情報の第三者への提供・開示</h2>
                    <p className="mb-2">当運営では、個人情報を第三者に提供する場合は、あらかじめお客様本人に同意を得て行います。但し、以下のいずれかに該当する場合は、この限りではありません。</p>
                    <ol className="list-decimal list-inside space-y-2 ml-2">
                        <li>法令に基づく場合</li>
                        <li>人命、身体又は財産などの保護のために必要な場合</li>
                        <li>公的機関等又はそれらの委託を受けた者より、開示請求を受領した場合</li>
                        <li>利用目的の達成に必要な範囲で、個人情報の取扱いの全部もしくは一部を委託する場合</li>
                        <li>事業承継に伴って個人情報が提供される場合</li>
                    </ol>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-4 text-secondary border-b pb-2">6. 個人情報の開示・訂正・利用停止</h2>
                    <p>
                        お客様から個人情報に関する利用目的の通知、開示、内容の訂正・追加・削除及び利用停止、あるいは第三者提供記録の開示を求められた場合には、本人確認の上、適切に対応します。
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-4 text-secondary border-b pb-2">7. クッキー（Cookie）</h2>
                    <p>
                        本サービスでは、利便性向上や統計データ取得のためにCookieを使用します。また、広告配信のために第三者企業の広告サービスを利用する場合があります。これらはブラウザの設定で無効化することができます。
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-4 text-secondary border-b pb-2">8. お問い合わせ窓口</h2>
                    <p className="mb-4">本ポリシーに関するお問い合わせは、下記までお願いいたします。</p>
                    <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                        <h3 className="font-bold text-lg mb-2">Project Market Hub運営事務局</h3>
                        <ul className="space-y-2">
                            <li><span className="font-semibold w-24 inline-block">運営責任者:</span> 山本健太</li>
                            <li><span className="font-semibold w-24 inline-block">所在地:</span> 〒600-8208 京都府京都市下京区小稲荷町85-2 Grand-K 京都駅前ビル 201</li>
                            <li><span className="font-semibold w-24 inline-block">Email:</span> <a href="mailto:service@meeting-agency.com" className="text-primary hover:underline">service@meeting-agency.com</a></li>
                        </ul>
                    </div>
                </section>

                <div className="text-right text-sm text-gray-500 mt-8">
                    2025年11月23日 制定
                </div>
            </div>
        </div>
    );
}
