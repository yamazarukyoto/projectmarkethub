// fix_jobs_completed.js
// ユーザーのjobsCompletedフィールドを実際の完了契約数に基づいて更新するスクリプト

const admin = require('firebase-admin');

// Firebase Admin SDK初期化
const serviceAccount = require('./projectmarkethub-db904-firebase-adminsdk-fbsvc-c939a497e0.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'projectmarkethub-db904'
});

const db = admin.firestore();

async function fixJobsCompleted() {
    try {
        // 特定のユーザーID（やまもとけんた）
        const userId = 'QsDYvX60TOaeBQQxPnrPrXDPvqW2';
        
        // 完了した契約をカウント
        const contractsSnapshot = await db.collection('contracts')
            .where('workerId', '==', userId)
            .where('status', '==', 'completed')
            .get();
        
        const completedCount = contractsSnapshot.size;
        console.log(`User ${userId}: Found ${completedCount} completed contracts`);
        
        // ユーザードキュメントを更新
        await db.collection('users').doc(userId).update({
            jobsCompleted: completedCount
        });
        
        console.log(`Updated user ${userId} jobsCompleted to ${completedCount}`);
        
        // 確認のため再度取得
        const userDoc = await db.collection('users').doc(userId).get();
        console.log('Updated user data:', {
            displayName: userDoc.data().displayName,
            jobsCompleted: userDoc.data().jobsCompleted
        });
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

fixJobsCompleted();
