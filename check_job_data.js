// check_job_data.js - ジョブの添付ファイルデータ構造を確認
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

async function checkJobData() {
    try {
        // 特定のジョブを確認
        const jobId = 'VqahFoGtFfVkpZOBlp7y';
        const jobDoc = await db.collection('jobs').doc(jobId).get();
        
        if (!jobDoc.exists) {
            console.log('Job not found:', jobId);
            
            // 最新のジョブを取得
            console.log('\nFetching latest jobs with attachments...');
            const jobsSnapshot = await db.collection('jobs')
                .orderBy('createdAt', 'desc')
                .limit(10)
                .get();
            
            jobsSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.attachments && data.attachments.length > 0) {
                    console.log('\n--- Job ID:', doc.id, '---');
                    console.log('Title:', data.title);
                    console.log('Attachments:', JSON.stringify(data.attachments, null, 2));
                }
            });
        } else {
            const data = jobDoc.data();
            console.log('Job ID:', jobId);
            console.log('Title:', data.title);
            console.log('Attachments type:', typeof data.attachments);
            console.log('Attachments:', JSON.stringify(data.attachments, null, 2));
            
            if (data.attachments && data.attachments.length > 0) {
                data.attachments.forEach((att, index) => {
                    console.log(`\nAttachment ${index + 1}:`);
                    console.log('  Type:', typeof att);
                    if (typeof att === 'string') {
                        console.log('  URL:', att);
                    } else {
                        console.log('  Name:', att.name);
                        console.log('  URL:', att.url);
                    }
                });
            }
        }
        
        // 提案の添付ファイルも確認
        console.log('\n\n=== Checking Proposals with Attachments ===');
        const proposalsSnapshot = await db.collection('proposals')
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();
        
        proposalsSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.attachments && data.attachments.length > 0) {
                console.log('\n--- Proposal ID:', doc.id, '---');
                console.log('Worker:', data.workerName);
                console.log('Attachments:', JSON.stringify(data.attachments, null, 2));
            }
        });
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

checkJobData();
