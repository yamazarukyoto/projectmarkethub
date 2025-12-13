import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'dummy_key', {
    apiVersion: '2025-01-27.acacia' as any, // Use latest or cast to any to avoid type mismatch with installed package
    typescript: true,
});

export const createPaymentIntent = async (
    amount: number,
    currency: string = 'jpy',
    metadata: Record<string, string> = {}
): Promise<Stripe.PaymentIntent> => {
    return await stripe.paymentIntents.create({
        amount,
        currency,
        capture_method: 'manual', // 仮払い（オーソリのみ）
        metadata,
        payment_method_types: ['card'], // カード決済のみを許可（Link等の干渉回避）
    });
};

export const capturePaymentIntent = async (
    paymentIntentId: string,
    amount?: number
): Promise<Stripe.PaymentIntent> => {
    const options: Stripe.PaymentIntentCaptureParams = {};
    if (amount) {
        options.amount_to_capture = amount;
    }
    return await stripe.paymentIntents.capture(paymentIntentId, options);
};

export const createTransfer = async (
    amount: number,
    destination: string,
    transferGroup: string,
    metadata: Record<string, string> = {}
): Promise<Stripe.Transfer> => {
    return await stripe.transfers.create({
        amount,
        currency: 'jpy',
        destination,
        transfer_group: transferGroup,
        metadata,
    });
};

export const createRefund = async (
    paymentIntentId: string,
    amount?: number,
    metadata: Record<string, string> = {}
): Promise<Stripe.Refund> => {
    const options: Stripe.RefundCreateParams = {
        payment_intent: paymentIntentId,
        metadata,
    };
    if (amount) {
        options.amount = amount;
    }
    return await stripe.refunds.create(options);
};

export const createConnectAccount = async (
    email: string
): Promise<Stripe.Account> => {
    return await stripe.accounts.create({
        type: 'express',
        email,
        capabilities: {
            transfers: { requested: true },
        },
    });
};

export const createAccountLink = async (
    accountId: string,
    refreshUrl: string,
    returnUrl: string
): Promise<Stripe.AccountLink> => {
    return await stripe.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding',
    });
};

export const createVerificationSession = async (
    userId: string,
    returnUrl: string
): Promise<Stripe.Identity.VerificationSession> => {
    return await stripe.identity.verificationSessions.create({
        type: 'document',
        metadata: {
            userId,
        },
        options: {
            document: {
                require_matching_selfie: true,
            },
        },
        return_url: returnUrl,
    });
};
