const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'projectmarkethub-db904'
  });
}

const db = admin.firestore();

async function checkProposals() {
  console.log('Checking proposals data...');
  const jobId = 'GAK8dybqk0ahm7N4ApK0'; // 対象のJob ID

  try {
    // 全件取得
    const proposalsSnapshot = await db.collection('proposals').where('jobId', '==', jobId).get();
    console.log(`Found ${proposalsSnapshot.size} proposals for Job ID: ${jobId}`);

    proposalsSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`Proposal ID: ${doc.id}`);
      console.log(`  Client ID: ${data.clientId}`);
      console.log(`  Worker ID: ${data.workerId}`);
      console.log(`  CreatedAt Type: ${data.createdAt ? data.createdAt.constructor.name : 'undefined'}`);
      if (data.createdAt && data.createdAt.toDate) {
          console.log(`  CreatedAt: ${data.createdAt.toDate()}`);
      }
      console.log('---');
    });

  } catch (error) {
    console.error('Error checking proposals:', error);
  }
}

checkProposals();
