import React from "react";

export default function TermsPage() {
    return (
        <div className="container mx-auto px-4 py-12 max-w-4xl">
            <h1 className="text-3xl font-bold mb-8 text-secondary">利用規約</h1>

            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 space-y-8 text-text-body">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                    <p className="text-amber-800 font-medium">
                        ⚠️ 重要：本サービスは個人運営のプラットフォームです。クライアントとワーカー間の取引・紛争について、運営者は仲介・調停・介入を行いません。ユーザー間の問題はユーザー同士で解決していただく必要があります。
                    </p>
                </div>

                <p>
                    本利用規約（以下「本規約」といいます。）は、山本健太（以下「運営者」といいます。）が提供する「Project Market Hub」（以下「本サービス」といいます。）の利用条件を定めるものです。登録ユーザーの皆様（以下「ユーザー」といいます。）には、本規約に従って本サービスをご利用いただきます。
                </p>

                <section>
                    <h2 className="text-xl font-bold mb-4 text-secondary border-b pb-2">第1条（適用）</h2>
                    <ol className="list-decimal list-inside space-y-2 ml-2">
                        <li>本規約は、ユーザーと運営者との間の本サービスの利用に関わる一切の関係に適用されるものとします。</li>
                        <li>運営者は本サービスに関し、本規約のほか、ご利用にあたってのルール等、各種の定め（以下「個別規定」といいます。）をすることがあります。これら個別規定はその名称のいかんに関わらず、本規約の一部を構成するものとします。</li>
                        <li>本規約の規定が前項の個別規定の規定と矛盾する場合には、個別規定において特段の定めなき限り、個別規定の規定が優先されるものとします。</li>
                    </ol>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-4 text-secondary border-b pb-2">第2条（定義）</h2>
                    <p className="mb-2">本規約において使用する用語の定義は、以下のとおりとします。</p>
                    <ol className="list-decimal list-inside space-y-2 ml-2">
                        <li><strong>「本サービス」</strong>：運営者が運営する「Project Market Hub」と称するウェブサイトおよび関連サービス。クライアントとワーカーをマッチングするプラットフォームを提供するものであり、取引の当事者となるものではありません。</li>
                        <li><strong>「ユーザー」</strong>：本サービスを利用するために会員登録を行った個人または法人。</li>
                        <li><strong>「クライアント」</strong>：本サービスを通じて業務を依頼するユーザー。</li>
                        <li><strong>「ワーカー」</strong>：本サービスを通じて業務を受託するユーザー。</li>
                        <li><strong>「本取引」</strong>：本サービスを通じてクライアントとワーカーの間で締結される業務委託契約。運営者は本取引の当事者ではありません。</li>
                        <li><strong>「仮払い」</strong>：クライアントがワーカーに対する報酬を、運営者が指定する決済サービス（Stripe）を通じて一時的に預け入れること。</li>
                    </ol>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-4 text-secondary border-b pb-2">第3条（本サービスの性質）</h2>
                    <ol className="list-decimal list-inside space-y-2 ml-2">
                        <li>本サービスは、クライアントとワーカーをマッチングするプラットフォームを提供するものであり、運営者は取引の当事者ではありません。</li>
                        <li>本サービスは個人により運営されており、大規模なカスタマーサポート体制を有しておりません。お問い合わせへの対応には時間を要する場合があり、また対応できない場合があることをご了承ください。</li>
                        <li>運営者は、ユーザー間の取引内容、成果物の品質、納期の遵守等について一切関与せず、これらに関する責任を負いません。</li>
                        <li>本サービスの機能は、システムによる自動処理を基本としており、個別の手動対応には限界があります。</li>
                    </ol>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-4 text-secondary border-b pb-2">第4条（利用登録）</h2>
                    <ol className="list-decimal list-inside space-y-2 ml-2">
                        <li>登録希望者が運営者の定める方法によって利用登録を申請し、運営者がこれを承認することによって、利用登録が完了するものとします。</li>
                        <li>運営者は、利用登録の申請者に以下の事由があると判断した場合、利用登録の申請を承認しないことがあり、その理由については一切の開示義務を負わないものとします。
                            <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-gray-600">
                                <li>虚偽の事項を届け出た場合</li>
                                <li>本規約に違反したことがある者からの申請である場合</li>
                                <li>反社会的勢力等に該当する場合</li>
                                <li>その他、運営者が利用登録を相当でないと判断した場合</li>
                            </ul>
                        </li>
                        <li>利用登録の審査は、運営者の裁量により行われ、審査基準の開示や審査結果の理由説明は行いません。</li>
                    </ol>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-4 text-secondary border-b pb-2">第5条（ユーザーIDおよびパスワードの管理）</h2>
                    <ol className="list-decimal list-inside space-y-2 ml-2">
                        <li>ユーザーは、自己の責任において、本サービスのユーザーIDおよびパスワードを適切に管理するものとします。</li>
                        <li>ユーザーは、いかなる場合にも、ユーザーIDおよびパスワードを第三者に譲渡または貸与し、もしくは第三者と共用することはできません。</li>
                        <li>運営者は、ユーザーIDとパスワードの組み合わせが登録情報と一致してログインされた場合には、そのユーザーIDを登録しているユーザー自身による利用とみなします。</li>
                        <li>パスワードの紛失・漏洩等による損害について、運営者は一切の責任を負いません。パスワードリセット機能をご利用ください。</li>
                    </ol>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-4 text-secondary border-b pb-2">第6条（ユーザー間取引および紛争）</h2>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                        <p className="text-red-800 font-medium">
                            本条は特に重要な条項です。必ずお読みください。
                        </p>
                    </div>
                    <ol className="list-decimal list-inside space-y-2 ml-2">
                        <li><strong>運営者は、クライアントとワーカー間の取引の当事者ではなく、取引に関する一切の責任を負いません。</strong></li>
                        <li><strong>クライアントとワーカー間で発生した紛争、トラブル、クレーム等について、運営者は仲介、調停、仲裁その他一切の介入を行いません。</strong>ユーザー間の問題は、当事者間で直接解決していただく必要があります。</li>
                        <li>運営者は、以下の事項について一切関与せず、責任を負いません：
                            <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-gray-600">
                                <li>成果物の品質、内容、納期に関する紛争</li>
                                <li>報酬金額、支払条件に関する紛争</li>
                                <li>契約内容の解釈に関する紛争</li>
                                <li>著作権、知的財産権に関する紛争</li>
                                <li>秘密保持義務違反に関する紛争</li>
                                <li>その他ユーザー間で発生するあらゆる紛争</li>
                            </ul>
                        </li>
                        <li>紛争が発生した場合、ユーザーは自己の責任と費用において解決するものとし、運営者に対して損害賠償その他一切の請求を行わないものとします。</li>
                        <li>運営者は、紛争解決のための証拠提供、情報開示等の協力義務を負いません。ただし、法令に基づく正当な要請がある場合はこの限りではありません。</li>
                        <li>ユーザーは、取引開始前に相手方の評価、実績、プロフィール等を十分に確認し、自己の判断と責任において取引を行うものとします。</li>
                    </ol>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-4 text-secondary border-b pb-2">第7条（仮払いおよび決済）</h2>
                    <ol className="list-decimal list-inside space-y-2 ml-2">
                        <li>クライアントは、契約成立時に報酬相当額を仮払いするものとします。仮払いは、決済サービス（Stripe）を通じて行われます。</li>
                        <li>仮払いされた金額は、クライアントによる検収完了後、システムにより自動的にワーカーに送金されます。</li>
                        <li>検収完了前のキャンセルについては、システムの定める手続きに従い、自動的に処理されます。</li>
                        <li>決済に関するトラブル（クレジットカードの不正利用等）については、決済サービス提供者（Stripe）の規約に従って処理されます。</li>
                        <li>運営者は、決済サービスの障害、遅延等により生じた損害について責任を負いません。</li>
                    </ol>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-4 text-secondary border-b pb-2">第8条（手数料）</h2>
                    <ol className="list-decimal list-inside space-y-2 ml-2">
                        <li>本サービスの利用にあたり、運営者は取引金額に対して所定の手数料を徴収します。</li>
                        <li>手数料率は、本サービス上に表示されるものとし、運営者は事前の通知により変更することができます。</li>
                        <li>一度支払われた手数料は、いかなる理由があっても返金されません。</li>
                    </ol>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-4 text-secondary border-b pb-2">第9条（禁止事項）</h2>
                    <p className="mb-2">ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。</p>
                    <ol className="list-decimal list-inside space-y-2 ml-2">
                        <li>法令または公序良俗に違反する行為</li>
                        <li>犯罪行為に関連する行為</li>
                        <li>本サービスの内容等、本サービスに含まれる著作権、商標権ほか知的財産権を侵害する行為</li>
                        <li>運営者、ほかのユーザー、またはその他第三者のサーバーまたはネットワークの機能を破壊したり、妨害したりする行為</li>
                        <li>本サービスによって得られた情報を商業的に利用する行為</li>
                        <li>運営者のサービスの運営を妨害するおそれのある行為</li>
                        <li>不正アクセスをし、またはこれを試みる行為</li>
                        <li>他のユーザーに関する個人情報等を収集または蓄積する行為</li>
                        <li>不正な目的を持って本サービスを利用する行為</li>
                        <li>本サービスの他のユーザーまたはその他の第三者に不利益、損害、不快感を与える行為</li>
                        <li>他のユーザーに成りすます行為</li>
                        <li>運営者が許諾しない本サービス上での宣伝、広告、勧誘、または営業行為</li>
                        <li><strong>本サービス外での直接取引を誘引する行為（直接取引の禁止）</strong></li>
                        <li>面識のない異性との出会いを目的とした行為</li>
                        <li>反社会的勢力等への利益供与</li>
                        <li>運営者への過度な問い合わせ、クレーム、要求等により業務を妨害する行為</li>
                        <li>その他、運営者が不適切と判断する行為</li>
                    </ol>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-4 text-secondary border-b pb-2">第10条（本サービスの提供の停止等）</h2>
                    <ol className="list-decimal list-inside space-y-2 ml-2">
                        <li>運営者は、以下のいずれかの事由があると判断した場合、ユーザーに事前に通知することなく本サービスの全部または一部の提供を停止または中断することができるものとします。
                            <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-gray-600">
                                <li>本サービスにかかるコンピュータシステムの保守点検または更新を行う場合</li>
                                <li>地震、落雷、火災、停電または天災などの不可抗力により、本サービスの提供が困難となった場合</li>
                                <li>コンピュータまたは通信回線等が事故により停止した場合</li>
                                <li>運営者の体調不良、私的事情等により運営が困難な場合</li>
                                <li>その他、運営者が本サービスの提供が困難と判断した場合</li>
                            </ul>
                        </li>
                        <li>運営者は、本サービスの提供の停止または中断により、ユーザーまたは第三者が被ったいかなる不利益または損害についても、一切の責任を負わないものとします。</li>
                        <li>本サービスは、予告なく終了する場合があります。サービス終了時、進行中の取引については、可能な限り完了まで対応しますが、保証するものではありません。</li>
                    </ol>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-4 text-secondary border-b pb-2">第11条（利用制限および登録抹消）</h2>
                    <ol className="list-decimal list-inside space-y-2 ml-2">
                        <li>運営者は、ユーザーが以下のいずれかに該当する場合には、事前の通知なく、ユーザーに対して、本サービスの全部もしくは一部の利用を制限し、またはユーザーとしての登録を抹消することができるものとします。
                            <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-gray-600">
                                <li>本規約のいずれかの条項に違反した場合</li>
                                <li>登録事項に虚偽の事実があることが判明した場合</li>
                                <li>料金等の支払債務の不履行があった場合</li>
                                <li>運営者からの連絡に対し、一定期間返答がない場合</li>
                                <li>本サービスについて、最終の利用から一定期間利用がない場合</li>
                                <li>他のユーザーから複数の苦情・通報があった場合</li>
                                <li>その他、運営者が本サービスの利用を適当でないと判断した場合</li>
                            </ul>
                        </li>
                        <li>運営者は、本条に基づき運営者が行った行為によりユーザーに生じた損害について、一切の責任を負いません。</li>
                        <li>利用制限または登録抹消の理由について、運営者は開示義務を負いません。</li>
                    </ol>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-4 text-secondary border-b pb-2">第12条（退会）</h2>
                    <ol className="list-decimal list-inside space-y-2 ml-2">
                        <li>ユーザーは、運営者の定める退会手続により、本サービスから退会できるものとします。</li>
                        <li>ただし、未完了の取引（仮払い中の案件、検収待ちの案件等）がある場合は、それらが完了するまで退会できません。</li>
                        <li>退会後、ユーザーのデータは運営者の判断により削除または保持されます。</li>
                    </ol>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-4 text-secondary border-b pb-2">第13条（保証の否認および免責事項）</h2>
                    <ol className="list-decimal list-inside space-y-2 ml-2">
                        <li>運営者は、本サービスに事実上または法律上の瑕疵（安全性、信頼性、正確性、完全性、有効性、特定の目的への適合性、セキュリティなどに関する欠陥、エラーやバグ、権利侵害などを含みます。）がないことを明示的にも黙示的にも保証しておりません。</li>
                        <li>運営者は、本サービスに起因してユーザーに生じたあらゆる損害について、運営者の故意または重過失による場合を除き、一切の責任を負いません。</li>
                        <li><strong>運営者は、本サービスに関して、ユーザーと他のユーザーまたは第三者との間において生じた取引、連絡または紛争等について一切責任を負いません。</strong></li>
                        <li>運営者は、ユーザーが本サービスを利用することにより得た情報等の正確性、完全性、有用性等について保証しません。</li>
                        <li>運営者は、ユーザーの逸失利益、間接損害、特別損害、拡大損害、弁護士費用その他一切の損害について責任を負いません。</li>
                        <li>本サービスは個人運営であり、24時間365日の稼働、即時のサポート対応等を保証するものではありません。</li>
                    </ol>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-4 text-secondary border-b pb-2">第14条（サポートおよび問い合わせ）</h2>
                    <ol className="list-decimal list-inside space-y-2 ml-2">
                        <li>本サービスは個人運営のため、サポート対応には限界があります。</li>
                        <li>問い合わせへの回答には、数日から数週間を要する場合があります。</li>
                        <li>以下の問い合わせについては、対応いたしかねます：
                            <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-gray-600">
                                <li>ユーザー間の紛争に関する仲介・調停の依頼</li>
                                <li>取引内容、成果物の品質に関する判断の依頼</li>
                                <li>システムの仕様に関する詳細な説明の要求</li>
                                <li>個別のカスタマイズ対応の要求</li>
                                <li>その他、運営者が対応困難と判断するもの</li>
                            </ul>
                        </li>
                        <li>緊急を要する問題（セキュリティ上の問題等）については、可能な限り優先的に対応しますが、即時対応を保証するものではありません。</li>
                    </ol>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-4 text-secondary border-b pb-2">第15条（サービス内容の変更等）</h2>
                    <p>運営者は、ユーザーへの事前の告知なく、本サービスの内容を変更、追加または廃止することがあり、ユーザーはこれを承諾するものとします。</p>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-4 text-secondary border-b pb-2">第16条（利用規約の変更）</h2>
                    <ol className="list-decimal list-inside space-y-2 ml-2">
                        <li>運営者は以下の場合には、ユーザーの個別の同意を要せず、本規約を変更することができるものとします。
                            <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-gray-600">
                                <li>本規約の変更がユーザーの一般の利益に適合するとき。</li>
                                <li>本規約の変更が本サービス利用契約の目的に反せず、かつ、変更の必要性、変更後の内容の相当性その他の変更に係る事情に照らして合理的なものであるとき。</li>
                            </ul>
                        </li>
                        <li>運営者はユーザーに対し、前項による本規約の変更にあたり、事前に、本規約を変更する旨及び変更後の本規約の内容並びにその効力発生時期を本サービス上で通知します。</li>
                    </ol>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-4 text-secondary border-b pb-2">第17条（個人情報の取扱い）</h2>
                    <p>運営者は、本サービスの利用によって取得する個人情報については、別途定める「プライバシーポリシー」に従い適切に取り扱うものとします。</p>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-4 text-secondary border-b pb-2">第18条（通知または連絡）</h2>
                    <ol className="list-decimal list-inside space-y-2 ml-2">
                        <li>ユーザーと運営者との間の通知または連絡は、運営者の定める方法によって行うものとします。</li>
                        <li>運営者は、ユーザーから、運営者が別途定める方式に従った変更届け出がない限り、現在登録されている連絡先が有効なものとみなして当該連絡先へ通知または連絡を行い、これらは、発信時にユーザーへ到達したものとみなします。</li>
                        <li>運営者からの通知は、主にメールまたは本サービス上での表示により行います。</li>
                    </ol>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-4 text-secondary border-b pb-2">第19条（権利義務の譲渡の禁止）</h2>
                    <p>ユーザーは、運営者の書面による事前の承諾なく、利用契約上の地位または本規約に基づく権利もしくは義務を第三者に譲渡し、または担保に供することはできません。</p>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-4 text-secondary border-b pb-2">第20条（分離可能性）</h2>
                    <p>本規約のいずれかの条項またはその一部が、消費者契約法その他の法令等により無効または執行不能と判断された場合であっても、本規約の残りの規定および一部が無効または執行不能と判断された規定の残りの部分は、継続して完全に効力を有するものとします。</p>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-4 text-secondary border-b pb-2">第21条（準拠法・裁判管轄）</h2>
                    <ol className="list-decimal list-inside space-y-2 ml-2">
                        <li>本規約の解釈にあたっては、日本法を準拠法とします。</li>
                        <li>本サービスに関して紛争が生じた場合には、京都地方裁判所を第一審の専属的合意管轄裁判所とします。</li>
                    </ol>
                </section>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-8">
                    <h3 className="font-bold text-secondary mb-2">本規約の要点</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                        <li>本サービスはマッチングプラットフォームであり、取引の当事者ではありません</li>
                        <li>ユーザー間の紛争について、運営者は一切介入しません</li>
                        <li>個人運営のため、サポート対応には限界があります</li>
                        <li>取引は自己責任で行ってください</li>
                    </ul>
                </div>

                <div className="text-right text-sm text-gray-500 mt-8">
                    <p>2025年11月23日 制定</p>
                    <p>2025年11月30日 改定</p>
                </div>
            </div>
        </div>
    );
}
