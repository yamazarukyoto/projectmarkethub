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

async function updateJobsCompleted() {
    try {
        console.log('Fetching completed contracts...');
        
        // 完了した契約を取得
        const contractsRef = db.collection('contracts');
        const snapshot = await contractsRef.where('status', '==', 'completed').get();

        if (snapshot.empty) {
            console.log('No completed contracts found.');
            return;
        }

        console.log(`Found ${snapshot.size} completed contracts.`);

        // ユーザーごとの完了案件数をカウント
        const workerCounts = {};
        const clientCounts = {};

        snapshot.forEach(doc => {
            const data = doc.data();
            console.log(`Contract: ${doc.id}, Worker: ${data.workerId}, Client: ${data.clientId}`);
            
            // ワーカーとしての完了案件数
            if (data.workerId) {
                workerCounts[data.workerId] = (workerCounts[data.workerId] || 0) + 1;
            }
            
            // クライアントとしての完了案件数
            if (data.clientId) {
                clientCounts[data.clientId] = (clientCounts[data.clientId] || 0) + 1;
            }
        });

        console.log('\nWorker completed counts:', workerCounts);
        console.log('Client completed counts:', clientCounts);

        // 全ユーザーの完了案件数を更新
        const allUserIds = new Set([...Object.keys(workerCounts), ...Object.keys(clientCounts)]);
        
        for (const userId of allUserIds) {
            const workerCount = workerCounts[userId] || 0;
            const clientCount = clientCounts[userId] || 0;
            const totalCount = workerCount + clientCount;
            
            console.log(`\nUpdating user ${userId}: workerJobsCompleted=${workerCount}, clientJobsCompleted=${clientCount}, jobsCompleted=${totalCount}`);
            
            await db.collection('users').doc(userId).update({
                jobsCompleted: totalCount,
                workerJobsCompleted: workerCount,
                clientJobsCompleted: clientCount,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            
            console.log(`Updated user ${userId} successfully.`);
        }

        console.log('\nAll users updated successfully!');
    } catch (error) {
        console.error('Error:', error);
    }
}

updateJobsCompleted();
