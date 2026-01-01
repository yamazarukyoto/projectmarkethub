import { Header } from "@/components/layouts/Header";
import { Footer } from "@/components/layouts/Footer";
import { TopPageButtons } from "@/components/features/top/TopPageButtons";
import { Shield, Zap } from "lucide-react";

export default function Home() {
    return (
        <div className="flex flex-col min-h-screen bg-white text-gray-900 font-sans">
            <Header />
            <main className="flex-grow">
                {/* Hero Section */}
                <section className="relative pt-24 pb-32 overflow-hidden">
                    <div className="absolute inset-0 bg-gray-50 -skew-y-3 origin-top-left transform -translate-y-20 z-0"></div>
                    <div className="container mx-auto px-4 relative z-10">
                        <div className="max-w-4xl mx-auto text-center">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-primary text-sm font-medium mb-8">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                                </span>
                                業界最安水準の手数料 5%
                            </div>
                            <h1 className="text-5xl md:text-7xl font-bold mb-8 tracking-tight text-secondary">
                                プロフェッショナルな<br className="hidden md:block" />
                                仕事を、もっと自由に。
                            </h1>
                            <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
                                Project Market Hubは、無駄なコストを極限までカットした<br className="hidden sm:block" />
                                次世代のクラウドソーシングプラットフォームです。
                            </p>
                            
                            <TopPageButtons />
                            
                            <div className="mt-8">
                                <a href="/guide.pdf" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-500 hover:text-primary underline flex items-center justify-center gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="m9 15 3 3 3-3"/></svg>
                                    操作方法・仕事の手順はこちら (PDF)
                                </a>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Value Proposition Section */}
                <section className="py-24 bg-white">
                    <div className="container mx-auto px-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16">
                            {/* Feature 1 */}
                            <div className="flex flex-col items-start">
                                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-6 text-primary">
                                    <span className="text-xl font-bold">5%</span>
                                </div>
                                <h3 className="text-2xl font-bold mb-4 text-secondary">圧倒的な低手数料</h3>
                                <p className="text-gray-600 leading-relaxed">
                                    業界標準の20%に対し、当サービスは一律5%。
                                    クライアントの予算を最大限に活かし、ワーカーの手取りを最大化します。
                                </p>
                            </div>

                            {/* Feature 2 */}
                            <div className="flex flex-col items-start">
                                <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center mb-6 text-accent">
                                    <Shield size={24} />
                                </div>
                                <h3 className="text-2xl font-bold mb-4 text-secondary">安心の仮払いシステム</h3>
                                <p className="text-gray-600 leading-relaxed">
                                    契約時に報酬を仮払い（決済予約）することで、未払いや持ち逃げを防止。
                                    Stripe決済による堅牢なセキュリティで取引を守ります。
                                </p>
                            </div>

                            {/* Feature 3 */}
                            <div className="flex flex-col items-start">
                                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-6 text-gray-700">
                                    <Zap size={24} />
                                </div>
                                <h3 className="text-2xl font-bold mb-4 text-secondary">シンプルで高速</h3>
                                <p className="text-gray-600 leading-relaxed">
                                    複雑な機能や過剰な通知を排除。
                                    直感的なUIで、案件の検索から契約、納品までストレスなく完結します。
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

            </main>
            <Footer />
        </div>
    );
}
