import { Timestamp } from "firebase/firestore";

export interface User {
    uid: string;
    email: string;
    displayName: string;
    photoURL: string;
    userType: 'client' | 'worker' | 'both';
    createdAt: Timestamp;
    updatedAt: Timestamp;
    
    // Personal Info (Private)
    name?: string;
    nameKana?: string;
    birthDate?: string;
    gender?: string;
    address?: {
        postalCode: string;
        prefecture: string;
        city: string;
        building?: string;
    };
    phoneNumber?: string;

    // Verification
    verificationStatus: 'unsubmitted' | 'pending' | 'approved' | 'rejected';
    verificationRejectionReason?: string;
    identityDocumentUrls?: string[];

    // Stripe Connect
    stripeAccountId?: string;
    stripeCustomerId?: string;
    stripeOnboardingComplete: boolean;

    // Profiles
    clientProfile?: {
        companyName?: string;
        description?: string;
        website?: string;
    };

    workerProfile?: {
        title: string;
        bio: string;
        skills: string[];
        portfolioUrls?: string[];
        hoursPerWeek?: string;
        desiredUnitPrice?: number;
    };

    // Notification Settings
    notificationSettings?: {
        emailMessage: boolean;
        emailContract: boolean;
        emailScout: boolean;
        emailDaily: boolean;
    };

    // Stats (総合評価 - 後方互換性のため維持)
    rating: number;
    reviewCount: number;
    jobsCompleted: number;
    
    // Stats (役割別評価)
    clientRating?: number;      // クライアントとしての評価（ワーカーから受けた評価）
    clientReviewCount?: number; // クライアントとしての評価件数
    workerRating?: number;      // ワーカーとしての評価（クライアントから受けた評価）
    workerReviewCount?: number; // ワーカーとしての評価件数
}

export interface Job {
    id: string;
    clientId: string;
    clientName: string;
    clientPhotoURL: string;
    
    title: string;
    description: string;
    category: string;
    tags: string[];
    attachments?: { name: string; url: string }[];
    
    type: 'project';
    budgetType: 'fixed';
    budget: number;
    deadline: Timestamp;
    
    status: 'open' | 'closed' | 'filled' | 'cancelled' | 'payment_expired';

    createdAt: Timestamp;
    updatedAt: Timestamp;
    proposalCount: number;
}

export interface Proposal {
    id: string;
    jobId: string;
    clientId: string;
    workerId: string;
    
    workerName: string;
    workerPhotoURL: string;
    
    price: number;
    message: string;
    estimatedDuration: string;
    attachments: { name: string; url: string }[];
    
    status: 'pending' | 'interviewing' | 'rejected' | 'hired' | 'adopted';
    
    negotiationHistory: {
        senderId: string;
        price?: number;
        message: string;
        createdAt: Timestamp;
    }[];

    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface Contract {
    id: string;
    jobId: string;
    proposalId?: string; // Added for linking back to chat
    clientId: string;
    workerId: string;
    
    jobTitle: string;
    jobType: 'project';
    
    amount: number;
    tax: number;
    totalAmount: number;
    platformFee: number;
    workerReceiveAmount: number;
    
    status: 
        | 'pending_signature'
        | 'waiting_for_escrow'
        | 'escrow'
        | 'in_progress'
        | 'submitted'
        | 'disputed'
        | 'completed'
        | 'cancelled'
        | 'transfer_failed'
        | 'payment_expired';

    stripePaymentIntentId: string;
    stripeTransferId?: string;
    
    deliveryFiles?: { name: string; url: string }[];
    deliveryFileUrl?: string; // Backward compatibility
    deliveryMessage?: string;
    
    createdAt: Timestamp;
    escrowAt?: Timestamp;
    submittedAt?: Timestamp;
    completedAt?: Timestamp;
    clientReviewed?: boolean;
    workerReviewed?: boolean;
    
    // キャンセル関連
    cancelRequestedBy?: string;      // キャンセル申請者のUID
    cancelRequestedAt?: Timestamp;   // キャンセル申請日時
    cancelReason?: string;           // キャンセル理由
    cancelApprovedBy?: string;       // キャンセル承認者のUID
    cancelApprovedAt?: Timestamp;    // キャンセル承認日時
    cancelledAt?: Timestamp;         // キャンセル完了日時
    
    // 連絡不通報告
    noContactReportedAt?: Timestamp; // 連絡不通報告日時
    noContactReportReason?: string;  // 連絡不通報告理由
}

export interface Review {
    id: string;
    contractId: string;
    reviewerId: string;
    revieweeId: string;
    rating: number;
    comment: string;
    role: 'client' | 'worker';
    createdAt: Timestamp;
}

export interface Notification {
    id: string;
    userId: string;
    type: 'message' | 'contract' | 'payment' | 'payment_expired' | 'system';
    title: string;
    body: string;
    link?: string;
    read: boolean;
    createdAt: Timestamp;
}
