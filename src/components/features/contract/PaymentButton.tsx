"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Contract } from "@/types";
import { CreditCard } from "lucide-react";

interface PaymentButtonProps {
  contract: Contract;
  onPaymentComplete: () => void;
}

export function PaymentButton({ contract, onPaymentComplete }: PaymentButtonProps) {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);
    try {
      // TODO: Implement Stripe payment logic
      // 1. Create PaymentIntent
      // 2. Confirm Payment
      // 3. Update contract status
      console.log("Payment processing for contract:", contract.id);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      onPaymentComplete();
    } catch (error) {
      console.error("Payment failed:", error);
      alert("支払いに失敗しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      onClick={handlePayment} 
      disabled={loading}
      className="w-full bg-accent hover:bg-accent/90 text-white"
      size="lg"
    >
      <CreditCard className="mr-2" size={20} />
      {loading ? "処理中..." : `仮払いへ進む (${contract.totalAmount.toLocaleString()}円)`}
    </Button>
  );
}
