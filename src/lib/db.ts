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
import { User, Job, Proposal, Contract } from "@/types";

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
        ]) as any;

        return querySnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Job));
    } catch (error) {
        console.error("Error in getJobs:", error);
        throw error;
    }
};

// Proposal Functions
export const createProposal = async (proposal: Omit<Proposal, "id">): Promise<string> => {
    const docRef = await addDoc(collection(db, "proposals"), proposal);
    return docRef.id;
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
};

export const submitContractDelivery = async (contractId: string, deliveryFileUrl: string, deliveryMessage: string): Promise<void> => {
    const docRef = doc(db, "contracts", contractId);
    await updateDoc(docRef, {
        status: 'submitted',
        deliveryFileUrl,
        deliveryMessage,
        submittedAt: Timestamp.now()
    });
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

        const updates: any = {
            negotiationHistory: [...history, newMessage]
        };

        if (message.price) {
            updates.price = message.price;
        }

        await updateDoc(docRef, updates);
    }
};

// Task Functions
export const createTaskSubmission = async (submission: any): Promise<string> => {
    const docRef = await addDoc(collection(db, "task_submissions"), submission);
    return docRef.id;
};
