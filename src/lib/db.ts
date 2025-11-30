import { db } from "./firebase";
import {
    collection,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    query,
    where,
    getDocs,
    addDoc,
    orderBy,
    limit,
    Timestamp
} from "firebase/firestore";
import { User, Job, Proposal, Contract, TaskSubmission, Notification } from "@/types";

// User Functions
export const getUser = async (uid: string): Promise<User | null> => {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return docSnap.data() as User;
    } else {
        return null;
    }
};

export const createUser = async (user: User): Promise<void> => {
    await setDoc(doc(db, "users", user.uid), user);
};

export const updateUser = async (uid: string, data: Partial<User>): Promise<void> => {
    const docRef = doc(db, "users", uid);
    await updateDoc(docRef, data);
};

export const updateUserRating = async (uid: string, rating: number, count: number): Promise<void> => {
    const docRef = doc(db, "users", uid);
    await updateDoc(docRef, {
        rating,
        reviewCount: count
    });
};

// Job Functions
export const createJob = async (job: Omit<Job, "id">): Promise<string> => {
    const docRef = await addDoc(collection(db, "jobs"), job);
    return docRef.id;
};

export const getJob = async (jobId: string): Promise<Job | null> => {
    const docRef = doc(db, "jobs", jobId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Job;
    } else {
        return null;
    }
};

export const getJobs = async (category?: string): Promise<Job[]> => {
    try {
        let q = query(collection(db, "jobs"), orderBy("createdAt", "desc"));

        if (category) {
            q = query(q, where("category", "==", category));
        }

        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("getDocs timed out")), 10000)
        );
        
        const querySnapshot = await Promise.race([
            getDocs(q),
            timeoutPromise
        ]) as import("firebase/firestore").QuerySnapshot;

        return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Job));
    } catch (error) {
        console.error("Error in getJobs:", error);
        throw error;
    }
};

// Proposal Functions
export const createProposal = async (proposal: Omit<Proposal, "id">): Promise<string> => {
    const docRef = await addDoc(collection(db, "proposals"), proposal);
    
    // Notify Client
    await createNotification({
        userId: proposal.clientId,
        type: 'message',
        title: '新しい応募がありました',
        body: `${proposal.workerName}さんから提案が届きました。`,
        link: `/client/jobs/${proposal.jobId}`,
        read: false,
        createdAt: Timestamp.now()
    });

    return docRef.id;
};

export const getProposal = async (proposalId: string): Promise<Proposal | null> => {
    const docRef = doc(db, "proposals", proposalId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Proposal;
    } else {
        return null;
    }
};

export const getProposals = async (jobId: string): Promise<Proposal[]> => {
    const q = query(collection(db, "proposals"), where("jobId", "==", jobId), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Proposal));
};

export const getWorkerProposals = async (workerId: string): Promise<Proposal[]> => {
    const q = query(collection(db, "proposals"), where("workerId", "==", workerId));
    const querySnapshot = await getDocs(q);
    const proposals = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Proposal));
    return proposals.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
};

export const updateProposalStatus = async (proposalId: string, status: Proposal["status"]): Promise<void> => {
    const docRef = doc(db, "proposals", proposalId);
    await updateDoc(docRef, { status });
};

// Contract Functions
export const createContract = async (contract: Omit<Contract, "id">): Promise<string> => {
    const docRef = await addDoc(collection(db, "contracts"), contract);

    // Notify Worker
    await createNotification({
        userId: contract.workerId,
        type: 'contract',
        title: '契約が作成されました',
        body: `${contract.jobTitle}の契約が作成されました。確認してください。`,
        link: `/worker/contracts/${docRef.id}`,
        read: false,
        createdAt: Timestamp.now()
    });

    return docRef.id;
};

export const getContracts = async (userId: string, userType: 'client' | 'worker'): Promise<Contract[]> => {
    const field = userType === 'client' ? 'clientId' : 'workerId';
    const q = query(collection(db, "contracts"), where(field, "==", userId), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contract));
};

export const updateContractStatus = async (contractId: string, status: Contract["status"]): Promise<void> => {
    const docRef = doc(db, "contracts", contractId);
    await updateDoc(docRef, { status });

    // Fetch contract to get user IDs
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const contract = docSnap.data() as Contract;
        
        if (status === 'escrow') {
            await createNotification({
                userId: contract.workerId,
                type: 'payment',
                title: '仮払いが完了しました',
                body: 'クライアントの仮払いが完了しました。業務を開始してください。',
                link: `/worker/contracts/${contractId}`,
                read: false,
                createdAt: Timestamp.now()
            });
        } else if (status === 'completed') {
            await createNotification({
                userId: contract.workerId,
                type: 'payment',
                title: '検収が完了しました',
                body: '検収が完了し、報酬が確定しました。お疲れ様でした。',
                link: `/worker/contracts/${contractId}`,
                read: false,
                createdAt: Timestamp.now()
            });
        }
    }
};

export const submitContractDelivery = async (contractId: string, deliveryFileUrl: string, deliveryMessage: string): Promise<void> => {
    const docRef = doc(db, "contracts", contractId);
    await updateDoc(docRef, {
        status: 'submitted',
        deliveryFileUrl,
        deliveryMessage,
        submittedAt: Timestamp.now()
    });

    // Notify Client
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const contract = docSnap.data() as Contract;
        await createNotification({
            userId: contract.clientId,
            type: 'contract',
            title: '納品報告がありました',
            body: 'ワーカーから納品報告がありました。内容を確認し、検収を行ってください。',
            link: `/client/contracts/${contractId}`,
            read: false,
            createdAt: Timestamp.now()
        });
    }
};

// Worker Functions
export const getWorkers = async (): Promise<User[]> => {
    const q = query(collection(db, "users"), where("userType", "in", ["worker", "both"]), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as User);
};

// Negotiation Functions
export const addNegotiationMessage = async (proposalId: string, message: { senderId: string; message: string; price?: number }): Promise<void> => {
    const docRef = doc(db, "proposals", proposalId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const proposal = docSnap.data() as Proposal;
        const history = proposal.negotiationHistory || []; // Assuming negotiationHistory exists in type, if not need to add it

        // If type definition doesn't have negotiationHistory yet, we might need to cast or update type.
        // For now assuming we will update type or it's flexible.
        // Actually, let's check Proposal type again. It was in index.ts but I might have missed negotiationHistory.

        const newMessage = {
            ...message,
            createdAt: Timestamp.now()
        };

        const updates: Partial<Proposal> = {
            negotiationHistory: [...history, newMessage]
        };

        if (message.price) {
            updates.price = message.price;
        }

        await updateDoc(docRef, updates);
    }
};

// Task Functions
export const createTaskSubmission = async (submission: Omit<TaskSubmission, "id">): Promise<string> => {
    const docRef = await addDoc(collection(db, "task_submissions"), submission);
    
    // Get Job to notify client
    const jobDoc = await getDoc(doc(db, "jobs", submission.jobId));
    if (jobDoc.exists()) {
        const job = jobDoc.data() as Job;
        await createNotification({
            userId: job.clientId,
            type: 'contract',
            title: 'タスクが提出されました',
            body: `${job.title}に新しいタスク提出がありました。`,
            link: `/client/jobs/${submission.jobId}`,
            read: false,
            createdAt: Timestamp.now()
        });
    }

    return docRef.id;
};

export const getTaskSubmission = async (submissionId: string): Promise<TaskSubmission | null> => {
    const docRef = doc(db, "task_submissions", submissionId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as TaskSubmission;
    } else {
        return null;
    }
};

export const getTaskSubmissionsByJob = async (jobId: string): Promise<TaskSubmission[]> => {
    const q = query(collection(db, "task_submissions"), where("jobId", "==", jobId), orderBy("submittedAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TaskSubmission));
};

export const submitTaskAnswers = async (submissionId: string, answers: TaskSubmission["answers"]): Promise<void> => {
    const docRef = doc(db, "task_submissions", submissionId);
    await updateDoc(docRef, {
        answers,
        status: 'pending',
        submittedAt: Timestamp.now()
    });
};

export const reviewTaskSubmission = async (submissionId: string, status: 'approved' | 'rejected', reason?: string): Promise<void> => {
    const docRef = doc(db, "task_submissions", submissionId);
    const updates: Partial<TaskSubmission> = {
        status,
        reviewedAt: Timestamp.now()
    };
    if (reason) {
        updates.rejectionReason = reason;
    }
    await updateDoc(docRef, updates);
};

// Notification Functions
export const createNotification = async (notification: Omit<Notification, "id">): Promise<string> => {
    const docRef = await addDoc(collection(db, "notifications"), notification);
    return docRef.id;
};

export const getNotifications = async (userId: string): Promise<Notification[]> => {
    const q = query(collection(db, "notifications"), where("userId", "==", userId), orderBy("createdAt", "desc"), limit(20));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
};

export const markAsRead = async (notificationId: string): Promise<void> => {
    const docRef = doc(db, "notifications", notificationId);
    await updateDoc(docRef, { read: true });
};

// Additional User Functions
export const updateVerificationStatus = async (uid: string, status: User["verificationStatus"], reason?: string): Promise<void> => {
    const docRef = doc(db, "users", uid);
    const updates: Partial<User> = { verificationStatus: status };
    if (reason) updates.verificationRejectionReason = reason;
    await updateDoc(docRef, updates);
};

export const updateStripeConnectId = async (uid: string, accountId: string): Promise<void> => {
    const docRef = doc(db, "users", uid);
    await updateDoc(docRef, { stripeAccountId: accountId });
};

// Additional Job Functions
export const getClientJobs = async (clientId: string): Promise<Job[]> => {
    const q = query(collection(db, "jobs"), where("clientId", "==", clientId), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job));
};

// Additional Contract Functions
export const updatePaymentIntentId = async (contractId: string, paymentIntentId: string): Promise<void> => {
    const docRef = doc(db, "contracts", contractId);
    await updateDoc(docRef, { stripePaymentIntentId: paymentIntentId });
};
