const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
require('dotenv').config({ path: '.env.local' });

// Initialize Firebase Admin
if (!admin.apps.length) {
  // Use application default credentials or mock for local testing if key is missing
  // For this specific environment, we might need to rely on existing initialized app or mock
  // But since we are running a standalone script, we need the key.
  // Let's try to use the environment variables if serviceAccountKey.json is missing, 
  // or just assume it's there but maybe in a different path?
  // Actually, previous scripts used it, so it should be there. 
  // Ah, the error says "Cannot find module './serviceAccountKey.json'".
  // Let's check if we can use a different way or if the file is missing.
  
  // Fallback: Try to construct credential from env vars if available (not standard but possible)
  // Or just print error and exit if file is missing.
  
  try {
      admin.initializeApp({
        credential: admin.credential.cert(require('./serviceAccountKey.json')),
      });
  } catch (e) {
      console.error("Failed to load serviceAccountKey.json. Please ensure it exists.");
      process.exit(1);
  }
}

const db = getFirestore();

async function checkContractError() {
  console.log('Checking contract error details...');
  
  try {
    const contractId = 'pXxBzO8r6aFf7itietU1';
    const doc = await db.collection('contracts').doc(contractId).get();
    
    if (doc.exists) {
      const data = doc.data();
      console.log('------------------------------------------------');
      console.log(`ID: ${doc.id}`);
      console.log(`Status: ${data.status}`);
      console.log(`Transfer Error: ${data.transferError}`);
      console.log(`Payment Status: ${data.paymentStatus}`);
      console.log('------------------------------------------------');
    } else {
      console.log('Contract not found.');
    }
  } catch (error) {
    console.error('Error fetching contract:', error);
  }
}

checkContractError();
