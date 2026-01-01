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

async function updateWorkerAccount() {
  const workerId = 'QsDYvX60TOaeBQQxPnrPrXDPvqW2'; // やまもとけんた
  const newStripeAccountId = 'acct_1SeSXzG7FhEsJzcQ'; // 新規作成したCustomアカウント

  try {
    console.log(`Updating worker ${workerId} with new Stripe Account ID: ${newStripeAccountId}...`);
    
    await db.collection('users').doc(workerId).update({
        stripeAccountId: newStripeAccountId,
        stripeOnboardingComplete: true, // 強制的に完了扱いにする
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('Worker account updated successfully.');

    // 確認
    const workerDoc = await db.collection('users').doc(workerId).get();
    console.log('Updated Worker Data:', JSON.stringify(workerDoc.data(), null, 2));

  } catch (error) {
    console.error('Error updating worker account:', error);
  }
}

updateWorkerAccount();
