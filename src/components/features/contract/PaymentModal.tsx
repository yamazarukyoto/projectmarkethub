"use client";

import React, { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/Button";
import { X } from "lucide-react";

// Stripe公開鍵の読み込み
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientSecret: string;
  onSuccess: () => void;
}

const CheckoutForm = ({ onSuccess, onClose }: { onSuccess: () => void; onClose: () => void }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // 決済完了後のリダイレクト先は指定しない（SPA内で完結させるため）
        // redirect: "if_required" を使用する
        return_url: window.location.href,
      },
      redirect: "if_required",
    });

    if (error) {
      setErrorMessage(error.message ?? "決済に失敗しました。");
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === "requires_capture") {
      // 仮払い成功 (manual captureなので requires_capture になるはず)
      onSuccess();
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
        // 万が一即時決済された場合も成功扱い
        onSuccess();
    } else {
      setErrorMessage("予期せぬステータスです: " + (paymentIntent?.status ?? "unknown"));
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {errorMessage && <div className="text-red-500 text-sm">{errorMessage}</div>}
      <div className="flex justify-end gap-2 mt-4">
        <Button type="button" variant="ghost" onClick={onClose} disabled={isProcessing}>
          キャンセル
        </Button>
        <Button type="submit" disabled={!stripe || isProcessing} className="bg-accent hover:bg-accent/90 text-white">
          {isProcessing ? "処理中..." : "仮払いを実行する"}
        </Button>
      </div>
    </form>
  );
};

export const PaymentModal = ({ isOpen, onClose, clientSecret, onSuccess }: PaymentModalProps) => {
  if (!isOpen) return null;

  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">仮払い手続き</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            クレジットカード情報を入力してください。この段階では決済は確定せず、仮払い（与信枠の確保）となります。
            検収完了時に決済が確定します。
          </p>
          {clientSecret && (
            <Elements stripe={stripePromise} options={options}>
              <CheckoutForm onSuccess={onSuccess} onClose={onClose} />
            </Elements>
          )}
        </div>
      </div>
    </div>
  );
};
