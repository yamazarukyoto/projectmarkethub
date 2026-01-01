
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const serviceAccount = JSON.parse(process.env.FIREBASE_PRIVATE_KEY ? 
    JSON.stringify({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }) : fs.readFileSync('service-account.json', 'utf8')
);

if (!process.env.FIREBASE_PRIVATE_KEY) {
    console.log("Warning: FIREBASE_PRIVATE_KEY not found in env, trying to use service-account.json if logic allows (but here we rely on env for simplicity in this script)");
}

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function checkJobAndContracts() {
    const jobId = "GAK8dybqk0ahm7N4ApK0"; // 対象のJob ID
    const proposalId = "YVgAzJITR96HKdQ5Ayo6"; // 対象のProposal ID

    console.log(`Checking Job ID: ${jobId}`);
    const jobDoc = await db.collection('jobs').doc(jobId).get();
    if (!jobDoc.exists) {
        console.log("Job not found");
    } else {
        console.log("Job Data:", jobDoc.data());
    }

    console.log(`\nChecking Contracts for Job ID: ${jobId}`);
    const contractsSnapshot = await db.collection('contracts').where('jobId', '==', jobId).get();
    if (contractsSnapshot.empty) {
        console.log("No contracts found for this job.");
    } else {
        contractsSnapshot.forEach(doc => {
            console.log(`Contract ID: ${doc.id}`, doc.data());
        });
    }

    console.log(`\nChecking Contracts for Proposal ID: ${proposalId}`);
    const contractsProposalSnapshot = await db.collection('contracts').where('proposalId', '==', proposalId).get();
    if (contractsProposalSnapshot.empty) {
        console.log("No contracts found for this proposal.");
    } else {
        contractsProposalSnapshot.forEach(doc => {
            console.log(`Contract ID: ${doc.id}`, doc.data());
        });
    }
}

checkJobAndContracts().catch(console.error);
