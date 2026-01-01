const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, query, orderBy } = require("firebase/firestore");
require('dotenv').config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkContracts() {
  try {
    console.log('Fetching contracts...');
    const q = query(collection(db, "contracts"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log('No contracts found.');
      return;
    }

    console.log(`Found ${querySnapshot.size} contracts.`);
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log('------------------------------------------------');
      console.log(`ID: ${doc.id}`);
      console.log(`Job Title: ${data.jobTitle}`);
      console.log(`Status: ${data.status}`);
      console.log(`Amount: ${data.amount}`);
      console.log(`Worker Receive Amount: ${data.workerReceiveAmount}`);
      console.log(`Stripe Payment Intent ID: ${data.stripePaymentIntentId}`);
      console.log(`Stripe Transfer ID: ${data.stripeTransferId}`);
      console.log(`Created At: ${data.createdAt ? data.createdAt.toDate() : 'N/A'}`);
      console.log(`Completed At: ${data.completedAt ? data.completedAt.toDate() : 'N/A'}`);
    });
  } catch (error) {
    console.error('Error fetching contracts:', error);
  }
}

checkContracts();
