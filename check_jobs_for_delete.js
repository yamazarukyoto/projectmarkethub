// check_jobs_for_delete.js - 削除可能なジョブを確認
require('dotenv').config({ path: '.env.local' });

const admin = require('firebase-admin');

// Firebase Admin初期化
if (!admin.apps.length) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (!privateKey) {
        console.error('FIREBASE_PRIVATE_KEY is not set');
        process.exit(1);
    }
    
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
    });
}

const db = admin.firestore();

async function checkJobs() {
    try {
        // やまもとけんたのユーザーID
        const clientId = 'Ct8Kp8xpWYYjBqLgkX0MD8HPBqf2';
        
        console.log('=== Checking jobs for client:', clientId, '===\n');
        
        const jobsSnapshot = await db.collection('jobs')
            .where('clientId', '==', clientId)
            .get();
        
        console.log('Total jobs found:', jobsSnapshot.size);
        console.log('\n');
        
        jobsSnapshot.forEach(doc => {
            const data = doc.data();
            const canDelete = data.status === 'open' && (data.proposalCount === 0 || data.proposalCount === undefined);
            console.log('Job ID:', doc.id);
            console.log('  Title:', data.title);
            console.log('  Status:', data.status);
            console.log('  ProposalCount:', data.proposalCount);
            console.log('  Can Delete:', canDelete ? '✓ YES' : '✗ NO');
            console.log('');
        });
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

checkJobs();
