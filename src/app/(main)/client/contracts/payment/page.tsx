"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useAuth } from "@/components/providers/AuthProvider";
import { getJob, getProposals } from "@/lib/db";
import { Job, Proposal } from "@/types";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { CheckCircle, AlertCircle } from "lucide-react";

// Initialize Stripe Elements
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function CheckoutForm({ clientSecret, onSuccess }: { clientSecret: string, onSuccess: () => void }) {
    const stripe = useStripe();
    const elements = useElements();
    const [message, setMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) return;

        setIsLoading(true);

        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: `${window.location.origin}/client/dashboard`, // Redirect after payment
            },
            redirect: 'if_required',
        });

        if (error) {
            setMessage(error.message || "An unexpected error occurred.");
        } else {
            setMessage("Payment succeeded!");
            onSuccess();
        }

        setIsLoading(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <PaymentElement />
            <Button disabled={isLoading || !stripe || !elements} className="w-full">
                {isLoading ? "処理中..." : "支払う"}
            </Button>
            {message && <div className="text-sm text-red-500">{message}</div>}
        </form>
    );
}

export default function ClientContractPage() {
    const params = useParams();
    const { user } = useAuth();
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [job, setJob] = useState<Job | null>(null);
    const [proposal, setProposal] = useState<Proposal | null>(null);

    // Ideally, we would fetch contract details here. 
    // For this flow, we assume we are coming from the Job Detail page to create a contract.
    // This is a simplified view to handle the payment.

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold text-secondary mb-6">契約と支払い</h1>

            {clientSecret && (
                <Card className="max-w-md mx-auto">
                    <CardHeader>
                        <CardTitle>仮決済手続き</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Elements stripe={stripePromise} options={{ clientSecret }}>
                            <CheckoutForm clientSecret={clientSecret} onSuccess={() => alert("支払いが完了しました！")} />
                        </Elements>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
