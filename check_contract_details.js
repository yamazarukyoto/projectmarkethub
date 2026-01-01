const admin = require('firebase-admin');
require('dotenv').config({ path: '.env.local' });

if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    if (process.env.FIREBASE_PRIVATE_KEY) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: projectId,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            }),
        });
    } else {
        admin.initializeApp({
            projectId: projectId,
        });
    }
}

const db = admin.firestore();

async function checkContractDetails() {
  const contractId = 'ng4nWWRyt03FYOjsRMzp'; // かかか契約ID
  try {
    console.log(`Fetching contract details for ${contractId}...`);
    const contractDoc = await db.collection('contracts').doc(contractId).get();

    if (!contractDoc.exists) {
      console.log('Contract not found.');
      return;
    }

    const contract = contractDoc.data();
    console.log('Contract Data:', JSON.stringify(contract, null, 2));

    const workerId = contract.workerId;
    if (workerId) {
        console.log(`Fetching worker details for ${workerId}...`);
        const workerDoc = await db.collection('users').doc(workerId).get();
        if (workerDoc.exists) {
            const worker = workerDoc.data();
            console.log('Worker Data:', JSON.stringify(worker, null, 2));
            console.log('-----------------------------------');
            console.log('Stripe Account ID:', worker.stripeAccountId);
            console.log('Stripe Onboarding Complete:', worker.stripeOnboardingComplete);
        } else {
            console.log('Worker not found.');
        }
    } else {
        console.log('Worker ID not found in contract.');
    }

  } catch (error) {
    console.error('Error fetching details:', error);
  }
}

checkContractDetails();
