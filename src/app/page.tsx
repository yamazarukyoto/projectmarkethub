import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ArrowRight, CheckCircle, Users, Briefcase, Shield } from "lucide-react";
import { Header } from "@/components/layouts/Header";
import { Footer } from "@/components/layouts/Footer";

export default function Home() {
    return (
        <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-grow">
                {/* Hero Section */}
                <section className="relative bg-gradient-to-br from-secondary to-[#1a3a6c] text-white py-20 overflow-hidden">
                    <div className="absolute inset-0 opacity-10"></div>
                    <div className="container mx-auto px-4 relative z-10">
                        <div className="max-w-3xl mx-auto text-center">
                            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                                <span className="inline-block">未来を創る</span>
                                <br className="hidden md:block" />
                                <span className="text-primary inline-block">プロフェッショナル</span>
                                <span className="inline-block">と出会う</span>
                            </h1>
                            <p className="text-lg md:text-xl text-gray-200 mb-8">
                                Project Market Hubは、信頼できるクライアントとスキルを持ったワーカーを繋ぐ、
                                次世代のクラウドソーシングプラットフォームです。
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Link href="/register" className="w-full sm:w-auto">
                                    <Button size="lg" className="w-full text-lg px-8 whitespace-nowrap">
                                        無料で始める <ArrowRight className="ml-2" size={20} />
                                    </Button>
                                </Link>
                                <Link href="/worker/search" className="w-full sm:w-auto">
                                    <Button variant="outline" size="lg" className="w-full text-lg px-8 border-white text-white hover:bg-white/10 hover:text-white whitespace-nowrap">
                                        仕事を探す
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section className="py-20 bg-white">
                    <div className="container mx-auto px-4">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-bold text-secondary mb-4">Project Market Hubが選ばれる理由</h2>
                            <p className="text-gray-600">安心して取引できる仕組みと、使いやすい機能を提供します。</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="p-8 rounded-xl bg-gray-50 border border-gray-100 hover:shadow-lg transition-shadow">
                                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                                    <Shield className="text-primary" size={24} />
                                </div>
                                <h3 className="text-xl font-bold mb-4">安心の決済システム</h3>
                                <p className="text-gray-600">
                                    仮決済（決済予約）システムにより、報酬の未払いや納品トラブルを防ぎます。Stripe決済で安全に取引できます。
                                </p>
                            </div>
                            <div className="p-8 rounded-xl bg-gray-50 border border-gray-100 hover:shadow-lg transition-shadow">
                                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-6">
                                    <Users className="text-accent" size={24} />
                                </div>
                                <h3 className="text-xl font-bold mb-4">一つのアカウントで完結</h3>
                                <p className="text-gray-600">
                                    発注も受注も、一つのアカウントでシームレスに切り替え可能。面倒なログインし直しは不要です。
                                </p>
                            </div>
                            <div className="p-8 rounded-xl bg-gray-50 border border-gray-100 hover:shadow-lg transition-shadow">
                                <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mb-6">
                                    <Briefcase className="text-secondary" size={24} />
                                </div>
                                <h3 className="text-xl font-bold mb-4">豊富な案件と人材</h3>
                                <p className="text-gray-600">
                                    Web開発、デザイン、ライティングなど、多種多様なカテゴリーの案件とプロフェッショナルが集まっています。
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-20 bg-gray-50">
                    <div className="container mx-auto px-4">
                        <div className="bg-secondary rounded-2xl p-8 md:p-16 text-center text-white relative overflow-hidden">
                            <div className="relative z-10">
                                <h2 className="text-3xl font-bold mb-6">あなたのスキルを価値に変えよう</h2>
                                <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
                                    Project Market Hubなら、あなたの得意なことで活躍できる場所がきっと見つかります。
                                    まずは無料で会員登録から始めましょう。
                                </p>
                                <Link href="/register">
                                    <Button size="lg" className="bg-accent hover:bg-accent/90 text-white border-none whitespace-nowrap">
                                        今すぐ会員登録する
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}
