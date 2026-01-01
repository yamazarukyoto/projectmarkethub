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
        // ローカル環境でADC (Application Default Credentials) を使用する場合
        admin.initializeApp({
            projectId: projectId,
        });
    }
}

const db = admin.firestore();

async function checkContracts() {
  try {
    console.log('Fetching contracts (Admin)...');
    const contractsRef = db.collection('contracts');
    const snapshot = await contractsRef.orderBy('createdAt', 'desc').limit(10).get();

    if (snapshot.empty) {
      console.log('No contracts found.');
      return;
    }

    console.log(`Found ${snapshot.size} contracts.`);
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log('------------------------------------------------');
      console.log(`ID: ${doc.id}`);
      console.log(`Job Title: ${data.jobTitle}`);
      console.log(`Status: ${data.status}`);
      console.log(`Amount: ${data.amount}`);
      console.log(`Worker Receive Amount: ${data.workerReceiveAmount}`);
      console.log(`Stripe Payment Intent ID: ${data.stripePaymentIntentId}`);
      console.log(`Stripe Transfer ID: ${data.stripeTransferId}`);
      console.log(`Transfer Error: ${data.transferError}`);
      console.log(`Created At: ${data.createdAt ? data.createdAt.toDate() : 'N/A'}`);
      console.log(`Completed At: ${data.completedAt ? data.completedAt.toDate() : 'N/A'}`);
    });
  } catch (error) {
    console.error('Error fetching contracts:', error);
  }
}

checkContracts();
