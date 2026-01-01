const admin = require('firebase-admin');

// Initialize Firebase Admin
// Assuming the environment is already set up for admin access or using default credentials
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'projectmarkethub-db904'
  });
}

const db = admin.firestore();

async function updateJobProposalCounts() {
  console.log('Starting job proposal count update...');

  try {
    // 1. Get all jobs
    const jobsSnapshot = await db.collection('jobs').get();
    console.log(`Found ${jobsSnapshot.size} jobs.`);

    let updatedCount = 0;

    for (const jobDoc of jobsSnapshot.docs) {
      const jobId = jobDoc.id;
      const jobData = jobDoc.data();

      // 2. Count proposals for this job
      const proposalsSnapshot = await db.collection('proposals')
        .where('jobId', '==', jobId)
        .get();
      
      const count = proposalsSnapshot.size;

      // 3. Update job if count is different
      if (jobData.proposalCount !== count) {
        await db.collection('jobs').doc(jobId).update({
          proposalCount: count
        });
        console.log(`Updated job ${jobId}: proposalCount ${jobData.proposalCount || 0} -> ${count}`);
        updatedCount++;
      }
    }

    console.log(`\nUpdate complete. Updated ${updatedCount} jobs.`);

  } catch (error) {
    console.error('Error updating job proposal counts:', error);
  }
}

updateJobProposalCounts();
