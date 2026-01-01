const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'projectmarkethub-db904'
  });
}

const db = admin.firestore();

// Target User (yamazarukyoto)
const TARGET_CLIENT_ID = '47JXWi71h1eCbjdUqubMMl0dgh53'; 

// Jobs to migrate
const JOB_IDS = ['QPCsf3FyuaOgNwoQiXMt', 'hkw2dWxIkY8J1cH7Ufob'];

async function migrateData() {
  console.log(`Migrating data to Client ID: ${TARGET_CLIENT_ID}...`);

  try {
    const batch = db.batch();
    let count = 0;

    // 1. Migrate Jobs
    for (const jobId of JOB_IDS) {
      const jobRef = db.collection('jobs').doc(jobId);
      const jobDoc = await jobRef.get();
      if (jobDoc.exists) {
        batch.update(jobRef, { clientId: TARGET_CLIENT_ID });
        console.log(`Queueing update for Job: ${jobId}`);
        count++;
      } else {
        console.log(`Job not found: ${jobId}`);
      }
    }

    // 2. Migrate Proposals linked to these Jobs
    for (const jobId of JOB_IDS) {
      const proposalsSnapshot = await db.collection('proposals').where('jobId', '==', jobId).get();
      proposalsSnapshot.forEach(doc => {
        batch.update(doc.ref, { clientId: TARGET_CLIENT_ID });
        console.log(`Queueing update for Proposal: ${doc.id}`);
        count++;
      });
    }

    // 3. Migrate Contracts linked to these Jobs
    for (const jobId of JOB_IDS) {
      const contractsSnapshot = await db.collection('contracts').where('jobId', '==', jobId).get();
      contractsSnapshot.forEach(doc => {
        batch.update(doc.ref, { clientId: TARGET_CLIENT_ID });
        console.log(`Queueing update for Contract: ${doc.id}`);
        count++;
      });
    }

    if (count > 0) {
      await batch.commit();
      console.log(`Successfully migrated ${count} documents.`);
    } else {
      console.log('No documents to migrate.');
    }

  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migrateData();
