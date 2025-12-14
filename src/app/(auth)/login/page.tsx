"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { signInWithEmailAndPassword, signInWithPopup, signInWithRedirect, getRedirectResult } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { getUser, createUser } from "@/lib/db";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/Card";
import { Timestamp } from "firebase/firestore";

const loginSchema = z.object({
    email: z.string().email("有効なメールアドレスを入力してください"),
    password: z.string().min(6, "パスワードは6文字以上で入力してください"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginFormValues) => {
        setIsLoading(true);
        setError(null);
        try {
            const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
            const user = userCredential.user;

            // Check if user exists in Firestore
            const existingUser = await getUser(user.uid);

            if (!existingUser) {
                // Create user document in Firestore if not exists (recovery for zombie accounts)
                await createUser({
                    uid: user.uid,
                    email: user.email!,
                    displayName: user.displayName || "No Name",
                    photoURL: user.photoURL || "",
                    userType: "both",
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now(),
                    verificationStatus: "unsubmitted",
                    stripeOnboardingComplete: false,
                    rating: 0,
                    reviewCount: 0,
                    jobsCompleted: 0,
                });
            }

            router.push("/client/dashboard"); // Default redirect
        } catch (err: any) {
            console.error("Login error:", err.code, err.message);
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
                setError("メールアドレスまたはパスワードが正しくありません。");
            } else if (err.code === 'auth/invalid-email') {
                setError("無効なメールアドレス形式です。");
            } else if (err.code === 'auth/too-many-requests') {
                setError("ログイン試行回数が多すぎます。しばらく待ってから再試行してください。");
            } else if (err.code === 'auth/network-request-failed') {
                setError("ネットワークエラーが発生しました。接続を確認してください。");
            } else if (err.code === 'auth/api-key-not-valid') {
                setError("Firebase APIキーが無効です。管理者に連絡してください。");
            } else {
                setError(`ログインエラー: ${err.code || err.message}`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            // Check if user exists in Firestore
            const existingUser = await getUser(user.uid);

            if (!existingUser) {
                // Create user document in Firestore if not exists
                await createUser({
                    uid: user.uid,
                    email: user.email!,
                    displayName: user.displayName || "No Name",
                    photoURL: user.photoURL || "",
                    userType: "both",
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now(),
                    verificationStatus: "unsubmitted",
                    stripeOnboardingComplete: false,
                    rating: 0,
                    reviewCount: 0,
                    jobsCompleted: 0,
                });
            }

            router.push("/client/dashboard");
        } catch (err: any) {
            console.error(err);
            let errorMessage = "Googleログイン中にエラーが発生しました。";
            if (err.code === 'auth/popup-closed-by-user') {
                errorMessage = "ログイン画面が閉じられました。";
            } else if (err.code === 'auth/cancelled-popup-request') {
                errorMessage = "複数のログインリクエストが発生しました。もう一度お試しください。";
            } else if (err.code === 'auth/popup-blocked') {
                errorMessage = "ポップアップがブロックされました。設定を確認してください。";
            } else if (err.message) {
                errorMessage = `エラー: ${err.message}`;
            }
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold text-secondary">ログイン</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="mb-6">
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full flex items-center justify-center gap-2"
                        onClick={handleGoogleSignIn}
                        disabled={isLoading}
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                fill="#4285F4"
                            />
                            <path
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                fill="#34A853"
                            />
                            <path
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                fill="#FBBC05"
                            />
                            <path
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                fill="#EA4335"
                            />
                        </svg>
                        Googleでログイン
                    </Button>
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-2 text-gray-500">または</span>
                        </div>
                    </div>
                </div>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <Input
                        label="メールアドレス"
                        type="email"
                        placeholder="example@email.com"
                        error={errors.email?.message}
                        {...register("email")}
                    />
                    <Input
                        label="パスワード"
                        type="password"
                        placeholder="••••••••"
                        error={errors.password?.message}
                        {...register("password")}
                    />

                    {error && (
                        <div className="text-sm text-danger text-center bg-danger/10 p-2 rounded">
                            {error}
                        </div>
                    )}

                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? "ログイン中..." : "ログイン"}
                    </Button>
                </form>
            </CardContent>
            <CardFooter className="justify-center">
                <p className="text-sm text-gray-600">
                    アカウントをお持ちでない方は{" "}
                    <Link href="/register" className="text-primary hover:underline font-medium">
                        会員登録
                    </Link>
                </p>
            </CardFooter>
        </Card>
    );
}
