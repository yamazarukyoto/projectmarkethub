const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'projectmarkethub-db904'
  });
}

const db = admin.firestore();
const auth = admin.auth();

async function checkUserAndJob() {
  console.log('Checking User and Job data...');

  try {
    // 1. Get User UID
    const email = 'kenta.yamamoto.mobile@gmail.com';
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
      console.log(`User found: ${email}`);
      console.log(`  UID: ${userRecord.uid}`);
    } catch (e) {
      console.log(`User not found: ${email}`);
      return;
    }

    const uid = userRecord.uid;

    // 2. Get Jobs for this user
    console.log(`\nChecking Jobs for Client ID: ${uid}`);
    const jobsSnapshot = await db.collection('jobs').where('clientId', '==', uid).get();
    
    if (jobsSnapshot.empty) {
      console.log('  No jobs found for this client.');
    } else {
      console.log(`  Found ${jobsSnapshot.size} jobs.`);
      jobsSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`  Job ID: ${doc.id}`);
        console.log(`    Title: ${data.title}`);
        console.log(`    Status: ${data.status}`);
        console.log(`    Proposal Count: ${data.proposalCount}`);
        
        // 3. Check Proposals for this job
        checkProposalsForJob(doc.id);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

async function checkProposalsForJob(jobId) {
  const proposalsSnapshot = await db.collection('proposals').where('jobId', '==', jobId).get();
  console.log(`    Proposals found: ${proposalsSnapshot.size}`);
  proposalsSnapshot.forEach(p => {
      console.log(`      Proposal ID: ${p.id}, Worker: ${p.data().workerName}, ClientID in Proposal: ${p.data().clientId}`);
  });
}

checkUserAndJob();
