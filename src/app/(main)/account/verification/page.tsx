"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { CheckCircle, AlertCircle, ShieldCheck, Clock } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { auth } from "@/lib/firebase";

export default function VerificationPage() {
  console.log("VerificationPage rendered");
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(3);

  const addDebugLog = (msg: string) => {
    console.log(msg);
    // setDebugInfo(prev => [...prev, `${new Date().toISOString().split('T')[1].slice(0, -1)}: ${msg}`]);
  };

  useEffect(() => {
    addDebugLog("VerificationPage mounted");
    const currentUser = auth.currentUser;
    addDebugLog(`Initial auth.currentUser: ${currentUser?.uid}`);
  }, []);

  // Handle automatic redirect when URL is set
  useEffect(() => {
    if (verificationUrl) {
      addDebugLog(`verificationUrl set: ${verificationUrl}`);
      addDebugLog("Starting redirect timer (3s)...");
      
      // Countdown timer
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      const timer = setTimeout(() => {
        addDebugLog("Executing window.location.assign...");
        try {
          window.location.assign(verificationUrl);
        } catch (e: any) {
          console.error("Redirect error:", e);
          addDebugLog(`Redirect error: ${e.message}`);
          setError(`リダイレクトエラー: ${e.message}`);
        }
      }, 3000);

      return () => {
        addDebugLog("Redirect timer cleanup (component unmounted or url changed)");
        clearTimeout(timer);
        clearInterval(interval);
      };
    }
  }, [verificationUrl]);

  const handleVerify = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    setVerificationUrl(null);
    setDebugInfo([]); // Clear previous logs
    addDebugLog("handleVerify started");
    
    setLoading(true);

    try {
      // Force refresh auth token to ensure we have a valid user
      const currentUser = auth.currentUser;
      addDebugLog(`Current user: ${currentUser?.uid}`);
      
      if (!currentUser) {
        const msg = "No current user found";
        console.error(msg);
        setError("ログイン状態が確認できませんでした。ページをリロードして再度お試しください。");
        setLoading(false);
        return;
      }

      addDebugLog("Getting ID token...");
      const token = await currentUser.getIdToken(true); // Force refresh
      addDebugLog("Token retrieved");
      
      if (!token) {
        const msg = "No token retrieved";
        console.error(msg);
        setError("認証トークンの取得に失敗しました。");
        setLoading(false);
        return;
      }

      addDebugLog("Sending request to /api/identity/create-verification-session");
      const response = await fetch('/api/identity/create-verification-session', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      addDebugLog(`Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Response error text:", errorText);
        addDebugLog(`Error text: ${errorText}`);
        throw new Error(`Failed to create verification session: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      addDebugLog(`Response data: ${JSON.stringify(data)}`);
      
      if (data.url) {
        addDebugLog(`URL received: ${data.url}`);
        setVerificationUrl(data.url);
        setLoading(false); // Show the manual link immediately
      } else {
        console.error("No URL returned from verification session creation");
        setError('エラーが発生しました。URLが取得できませんでした。');
        setLoading(false);
      }
    } catch (error: any) {
      console.error("handleVerify error:", error);
      addDebugLog(`Error caught: ${error.message}`);
      setError(`エラーが発生しました: ${error.message}`);
      setLoading(false);
    }
  };

  if (!user) {
    return null; // Or loading spinner
  }

  if (user.verificationStatus === 'approved') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="text-green-600" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-secondary mb-2">本人確認済み</h2>
          <p className="text-gray-600">
            本人確認が完了しています。信頼性の高いユーザーとして活動できます。
          </p>
        </Card>
      </div>
    );
  }

  if (user.verificationStatus === 'pending') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="text-blue-600" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-secondary mb-2">審査中</h2>
          <p className="text-gray-600">
            現在、提出された書類を確認しています。審査完了まで数日お待ちください。
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-secondary mb-6">本人確認</h1>
      
      {user.verificationStatus === 'rejected' && (
        <div className="max-w-2xl mx-auto mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="font-bold text-red-800">審査が否認されました</h3>
            <p className="text-red-700 text-sm">
              {user.verificationRejectionReason || "書類の確認ができませんでした。再度お試しください。"}
            </p>
          </div>
        </div>
      )}

      <Card className="max-w-2xl mx-auto p-6">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="text-indigo-600" size={32} />
          </div>
          <h2 className="text-xl font-bold mb-2">Stripe Identityによる本人確認</h2>
          <p className="text-gray-600 text-sm">
            安全な取引のために、本人確認へのご協力をお願いいたします。<br />
            Stripeのセキュアな環境で、運転免許証、マイナンバーカード、パスポートのいずれかを使用して本人確認を行います。
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600">
            <ul className="list-disc list-inside space-y-1">
              <li>スマートフォンまたはカメラ付きのPCが必要です</li>
              <li>顔写真付きの身分証明書をご用意ください</li>
              <li>所要時間は約3〜5分です</li>
            </ul>
          </div>

          {/* Error Message Display */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <strong>エラー:</strong> {error}
            </div>
          )}

          {/* Manual Link Display */}
          {verificationUrl && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
              <p className="text-green-800 mb-2 font-bold">準備が完了しました</p>
              <p className="text-sm text-green-700 mb-3">
                {countdown}秒後にStripeへ移動します...
              </p>
              <p className="text-xs text-green-600 mb-3">
                待たずに移動する場合は、以下のボタンをクリックしてください。
              </p>
              <a 
                href={verificationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors"
              >
                本人確認画面へ移動する (別タブで開く)
              </a>
            </div>
          )}

          {/* Debug Info Display - Hidden for production but kept in code for future debugging if needed */}
          {/* 
          <div className="p-4 bg-gray-100 border border-gray-300 rounded-lg text-xs font-mono overflow-auto max-h-40">
            <p className="font-bold mb-1">デバッグログ:</p>
            {debugInfo.length === 0 ? (
              <p className="text-gray-500">ログなし</p>
            ) : (
              <ul className="list-none space-y-0.5">
                {debugInfo.map((log, i) => (
                  <li key={i}>{log}</li>
                ))}
              </ul>
            )}
          </div>
          */}

          {/* Native button with styles matching the Button component */}
          {!verificationUrl && (
            <button 
              type="button"
              className={`w-full inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed bg-primary text-white hover:bg-primary-hover shadow-sm px-6 py-3 text-lg relative z-50 ${loading ? 'opacity-70 cursor-wait' : ''}`}
              onClick={handleVerify}
              disabled={loading}
            >
              {loading ? "準備中..." : "本人確認を開始する"}
            </button>
          )}
          
          <p className="text-xs text-center text-gray-500">
            ※ 外部サイト（Stripe）へ移動します
          </p>
        </div>
      </Card>
    </div>
  );
}
