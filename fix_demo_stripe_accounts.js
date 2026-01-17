/**
 * デモStripeアカウントを持つユーザーのstripeAccountIdを削除するスクリプト
 * 
 * 問題: 開発時のフォールバック処理により、acct_demo_で始まるダミーのStripeアカウントIDが
 * 保存されてしまい、本番環境でも「デモアカウント」として扱われてしまう
 * 
 * 解決: stripeAccountIdがacct_demo_で始まるユーザーのstripeAccountIdフィールドを削除し、
 * 再度正しくStripe連携を行えるようにする
 * 
 * 使用方法:
 * node fix_demo_stripe_accounts.js
 * 
 * オプション:
 * --dry-run: 実際には変更せず、対象ユーザーを表示するだけ
 * --user=<userId>: 特定のユーザーのみを対象にする
 */

const admin = require('firebase-admin');
require('dotenv').config({ path: '.env.local' });

// Firebase Admin初期化
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

async function findDemoStripeAccounts() {
    console.log('デモStripeアカウントを持つユーザーを検索中...\n');
    
    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();
    
    const demoUsers = [];
    
    snapshot.forEach(doc => {
        const data = doc.data();
        const stripeAccountId = data.stripeAccountId;
        
        if (stripeAccountId && stripeAccountId.startsWith('acct_demo')) {
            demoUsers.push({
                userId: doc.id,
                email: data.email || 'N/A',
                displayName: data.displayName || 'N/A',
                stripeAccountId: stripeAccountId
            });
        }
    });
    
    return demoUsers;
}

async function fixDemoStripeAccounts(dryRun = false, targetUserId = null) {
    const demoUsers = await findDemoStripeAccounts();
    
    if (demoUsers.length === 0) {
        console.log('✅ デモStripeアカウントを持つユーザーは見つかりませんでした。');
        return;
    }
    
    console.log(`📋 デモStripeアカウントを持つユーザー: ${demoUsers.length}件\n`);
    
    for (const user of demoUsers) {
        // 特定のユーザーのみを対象にする場合
        if (targetUserId && user.userId !== targetUserId) {
            continue;
        }
        
        console.log(`ユーザーID: ${user.userId}`);
        console.log(`  メール: ${user.email}`);
        console.log(`  表示名: ${user.displayName}`);
        console.log(`  StripeアカウントID: ${user.stripeAccountId}`);
        
        if (dryRun) {
            console.log(`  ⏸️  [DRY RUN] stripeAccountIdを削除します（実際には変更しません）\n`);
        } else {
            try {
                await db.collection('users').doc(user.userId).update({
                    stripeAccountId: admin.firestore.FieldValue.delete()
                });
                console.log(`  ✅ stripeAccountIdを削除しました\n`);
            } catch (error) {
                console.error(`  ❌ エラー: ${error.message}\n`);
            }
        }
    }
    
    if (dryRun) {
        console.log('\n📝 これはドライランです。実際に変更を適用するには --dry-run オプションを外して実行してください。');
    } else {
        console.log('\n✅ 完了しました。対象ユーザーは再度Stripe連携を行う必要があります。');
    }
}

// コマンドライン引数の解析
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const userArg = args.find(arg => arg.startsWith('--user='));
const targetUserId = userArg ? userArg.split('=')[1] : null;

console.log('='.repeat(60));
console.log('デモStripeアカウント修正スクリプト');
console.log('='.repeat(60));
console.log(`モード: ${dryRun ? 'ドライラン（変更なし）' : '本番実行'}`);
if (targetUserId) {
    console.log(`対象ユーザー: ${targetUserId}`);
}
console.log('='.repeat(60) + '\n');

fixDemoStripeAccounts(dryRun, targetUserId)
    .then(() => {
        process.exit(0);
    })
    .catch(error => {
        console.error('エラーが発生しました:', error);
        process.exit(1);
    });
