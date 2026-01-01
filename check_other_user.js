const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'projectmarkethub-db904'
  });
}

const auth = admin.auth();

async function checkUser() {
  const uid = '47JXWi71h1eCbjdUqubMMl0dgh53';
  try {
    const userRecord = await auth.getUser(uid);
    console.log(`User found: ${uid}`);
    console.log(`  Email: ${userRecord.email}`);
    console.log(`  DisplayName: ${userRecord.displayName}`);
  } catch (e) {
    console.log(`User not found: ${uid}`);
  }
}

checkUser();
