import { db, auth } from "./firebase";
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
    Timestamp,
    writeBatch,
    increment
} from "firebase/firestore";
import { User, Job, Proposal, Contract, Notification, Review } from "@/types";

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

// Review Functions
// revieweeRole: 被評価者の役割（'client' = クライアントとしての評価, 'worker' = ワーカーとしての評価）
// role === 'client' の場合、クライアントが評価した = ワーカーとしての評価
// role === 'worker' の場合、ワーカーが評価した = クライアントとしての評価
export const getUserReviews = async (
    userId: string, 
    limitCount: number = 10,
    revieweeRole?: 'client' | 'worker'  // 被評価者がどの立場で評価されたか
): Promise<Review[]> => {
    try {
        let q;
        if (revieweeRole) {
            // 役割別にフィルタリング
            // revieweeRole === 'worker' の場合、role === 'client' の評価を取得（クライアントがワーカーを評価）
            // revieweeRole === 'client' の場合、role === 'worker' の評価を取得（ワーカーがクライアントを評価）
            const reviewerRole = revieweeRole === 'worker' ? 'client' : 'worker';
            q = query(
                collection(db, "reviews"),
                where("revieweeId", "==", userId),
                where("role", "==", reviewerRole),
                orderBy("createdAt", "desc"),
                limit(limitCount)
            );
        } else {
            q = query(
                collection(db, "reviews"),
                where("revieweeId", "==", userId),
                orderBy("createdAt", "desc"),
                limit(limitCount)
            );
        }
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
    } catch (error) {
        console.warn("Index might be missing for getUserReviews, falling back to client-side sort:", error);
        // Fallback: インデックスがない場合はクライアントサイドでソート
        const q = query(collection(db, "reviews"), where("revieweeId", "==", userId));
        const querySnapshot = await getDocs(q);
        let reviews = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
        
        // 役割別フィルタリング（クライアントサイド）
        if (revieweeRole) {
            const reviewerRole = revieweeRole === 'worker' ? 'client' : 'worker';
            reviews = reviews.filter(r => r.role === reviewerRole);
        }
        
        return reviews.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()).slice(0, limitCount);
    }
};

export const submitReview = async (
    contractId: string,
    reviewerId: string,
    revieweeId: string,
    rating: number,
    comment: string,
    role: 'client' | 'worker'
): Promise<void> => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("Not authenticated");

    // Use Cloud Run direct URL to avoid domain mapping timeout issues
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const res = await fetch(`${apiUrl}/api/reviews/create`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            contractId,
            revieweeId,
            rating,
            comment,
            role
        }),
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to submit review");
    }
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
    
    // Update Job proposalCount
    const jobRef = doc(db, "jobs", proposal.jobId);
    await updateDoc(jobRef, {
        proposalCount: increment(1)
    });
    
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
    // セキュリティルールで認証済みユーザーはproposalsを読めるように設定済み
    try {
        const q = query(
            collection(db, "proposals"), 
            where("jobId", "==", jobId),
            orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Proposal));
    } catch (error) {
        console.warn("Index might be missing for getProposals, falling back to client-side sort:", error);
        const q = query(collection(db, "proposals"), where("jobId", "==", jobId));
        const querySnapshot = await getDocs(q);
        const proposals = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Proposal));
        return proposals.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
    }
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

export const getContractsForJob = async (jobId: string): Promise<Contract[]> => {
    const q = query(collection(db, "contracts"), where("jobId", "==", jobId));
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
        
        if (status === 'waiting_for_escrow') {
            // ワーカーが契約に合意した時、クライアントへ通知
            await createNotification({
                userId: contract.clientId,
                type: 'contract',
                title: 'ワーカーが契約に合意しました',
                body: `${contract.jobTitle}の契約にワーカーが合意しました。仮決済を行ってください。`,
                link: `/client/contracts/${contractId}`,
                read: false,
                createdAt: Timestamp.now()
            });
        } else if (status === 'escrow') {
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

export const submitContractDelivery = async (contractId: string, deliveryFiles: { name: string; url: string }[], deliveryMessage: string): Promise<void> => {
    const docRef = doc(db, "contracts", contractId);
    await updateDoc(docRef, {
        status: 'submitted',
        deliveryFiles,
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
export const getWorkers = async (skill?: string): Promise<User[]> => {
    let q = query(collection(db, "users"), where("userType", "in", ["worker", "both"]), orderBy("createdAt", "desc"));
    
    // Note: Firestore doesn't support array-contains with 'in' query easily in all cases, 
    // but for simple skill filtering we might need to do client-side filtering or separate query.
    // For now, let's fetch all and filter client-side if skill is provided, 
    // or use array-contains if we remove the 'in' check or use a composite index.
    // To keep it simple and robust without complex indexes for now:
    
    const querySnapshot = await getDocs(q);
    let workers = querySnapshot.docs.map(doc => doc.data() as User);

    if (skill) {
        workers = workers.filter(user => 
            user.workerProfile?.skills?.some(s => s.toLowerCase().includes(skill.toLowerCase()))
        );
    }

    return workers;
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


// Notification Functions
export const createNotification = async (notification: Omit<Notification, "id">): Promise<string> => {
    const docRef = await addDoc(collection(db, "notifications"), notification);
    return docRef.id;
};

export const getNotifications = async (userId: string, limitCount: number = 20): Promise<Notification[]> => {
    const q = query(collection(db, "notifications"), where("userId", "==", userId), orderBy("createdAt", "desc"), limit(limitCount));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
};

export const markAllAsRead = async (userId: string): Promise<void> => {
    const q = query(collection(db, "notifications"), where("userId", "==", userId), where("read", "==", false));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) return;

    const batch = writeBatch(db);
    querySnapshot.docs.forEach((doc) => {
        batch.update(doc.ref, { read: true });
    });
    await batch.commit();
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

// Get completed contracts count for a worker
export const getCompletedContractsCount = async (workerId: string): Promise<number> => {
    try {
        const q = query(
            collection(db, "contracts"),
            where("workerId", "==", workerId),
            where("status", "==", "completed")
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.size;
    } catch (error) {
        console.error("Error getting completed contracts count:", error);
        return 0;
    }
};
