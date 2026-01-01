
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, doc, getDoc } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
require('dotenv').config({ path: '.env.local' });

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function checkJobAndContracts() {
    try {
        // Login
        const email = "kenta.yamamoto.mobile@gmail.com";
        const password = "aaaaaa";
        await signInWithEmailAndPassword(auth, email, password);
        console.log("Logged in successfully.");

        const jobId = "GAK8dybqk0ahm7N4ApK0"; // 対象のJob ID
        const proposalId = "YVgAzJITR96HKdQ5Ayo6"; // 対象のProposal ID

        console.log(`Checking Job ID: ${jobId}`);
        const jobDoc = await getDoc(doc(db, 'jobs', jobId));
        if (!jobDoc.exists()) {
            console.log("Job not found");
        } else {
            console.log("Job Data:", jobDoc.data());
        }

        console.log(`\nChecking Contracts for Job ID: ${jobId}`);
        const q1 = query(collection(db, 'contracts'), where('jobId', '==', jobId));
        const contractsSnapshot = await getDocs(q1);
        if (contractsSnapshot.empty) {
            console.log("No contracts found for this job.");
        } else {
            contractsSnapshot.forEach(doc => {
                console.log(`Contract ID: ${doc.id}`, doc.data());
            });
        }

        console.log(`\nChecking Contracts for Proposal ID: ${proposalId}`);
        const q2 = query(collection(db, 'contracts'), where('proposalId', '==', proposalId));
        const contractsProposalSnapshot = await getDocs(q2);
        if (contractsProposalSnapshot.empty) {
            console.log("No contracts found for this proposal.");
        } else {
            contractsProposalSnapshot.forEach(doc => {
                console.log(`Contract ID: ${doc.id}`, doc.data());
            });
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

checkJobAndContracts();
