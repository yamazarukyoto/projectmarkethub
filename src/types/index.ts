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
    };

    // Notification Settings
    notificationSettings?: {
        emailMessage: boolean;
        emailContract: boolean;
        emailScout: boolean;
        emailDaily: boolean;
    };

    // Stats
    rating: number;
    reviewCount: number;
    jobsCompleted: number;
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
    attachments?: string[];
    
    type: 'project' | 'competition' | 'task';
    budgetType: 'fixed';
    budget: number;
    deadline: Timestamp;
    
    status: 'open' | 'selecting' | 'closed' | 'filled' | 'cancelled';
    
    // Type specific data
    competition?: {
        guaranteed: boolean;
        additionalPrizes?: number[];
    };
    task?: {
        unitPrice: number;
        quantity: number;
        timeLimit: number;
        questions: {
            id: string;
            type: 'text' | 'radio' | 'checkbox';
            text: string;
            options?: string[];
            required: boolean;
        }[];
    };

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
    attachments: string[];
    
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
    jobType: 'project' | 'competition' | 'task';
    
    amount: number;
    tax: number;
    totalAmount: number;
    platformFee: number;
    workerReceiveAmount: number;
    
    status: 
        | 'waiting_for_escrow'
        | 'escrow'
        | 'in_progress'
        | 'submitted'
        | 'disputed'
        | 'completed'
        | 'cancelled';

    stripePaymentIntentId: string;
    stripeTransferId?: string;
    
    deliveryFileUrl?: string;
    deliveryMessage?: string;
    
    createdAt: Timestamp;
    escrowAt?: Timestamp;
    submittedAt?: Timestamp;
    completedAt?: Timestamp;
}

export interface TaskSubmission {
    id: string;
    jobId: string;
    workerId: string;
    
    answers: {
        questionId: string;
        value: string | string[];
    }[];
    
    status: 'working' | 'pending' | 'approved' | 'rejected';
    rejectionReason?: string;
    
    startedAt: Timestamp;
    submittedAt?: Timestamp;
    reviewedAt?: Timestamp;
}

export interface Notification {
    id: string;
    userId: string;
    type: 'message' | 'contract' | 'payment' | 'system';
    title: string;
    body: string;
    link?: string;
    read: boolean;
    createdAt: Timestamp;
}
