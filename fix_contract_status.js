/**
 * 契約ステータス修正スクリプト
 * 
 * waiting_for_escrow ステータスの契約で、Stripeで決済が完了しているものを
 * escrow ステータスに更新します。
 * 
 * 使用方法:
 * 1. Firebase Admin SDK のサービスアカウントキーを設定
 * 2. Stripe APIキーを設定
 * 3. node fix_contract_status.js を実行
 */

const admin = require('firebase-admin');
const Stripe = require('stripe');

// 環境変数から設定を読み込み
require('dotenv').config({ path: '.env.local' });

// Firebase Admin SDK 初期化
// gcloud auth application-default login で認証済みの場合は自動で認証される
admin.initializeApp({
  projectId: 'projectmarkethub-db904'
});

const db = admin.firestore();

// Stripe 初期化
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
});

async function fixContractStatus() {
  console.log('契約ステータス修正スクリプトを開始します...\n');

  try {
    // waiting_for_escrow ステータスの契約を取得
    const contractsSnapshot = await db.collection('contracts')
      .where('status', '==', 'waiting_for_escrow')
      .get();

    console.log(`waiting_for_escrow ステータスの契約: ${contractsSnapshot.size}件\n`);

    if (contractsSnapshot.empty) {
      console.log('修正が必要な契約はありません。');
      return;
    }

    for (const doc of contractsSnapshot.docs) {
      const contract = doc.data();
      const contractId = doc.id;
      
      console.log(`\n契約ID: ${contractId}`);
      console.log(`  案件名: ${contract.jobTitle}`);
      console.log(`  PaymentIntent ID: ${contract.stripePaymentIntentId || 'なし'}`);

      if (!contract.stripePaymentIntentId) {
        console.log('  → PaymentIntent IDがないためスキップ');
        continue;
      }

      if (contract.stripePaymentIntentId === 'demo_payment_intent_id') {
        console.log('  → デモ用PaymentIntentのため、escrowに更新');
        await db.collection('contracts').doc(contractId).update({
          status: 'escrow',
          escrowAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log('  ✓ 更新完了');
        continue;
      }

      try {
        // Stripe PaymentIntent の状態を確認
        const paymentIntent = await stripe.paymentIntents.retrieve(contract.stripePaymentIntentId);
        console.log(`  Stripe ステータス: ${paymentIntent.status}`);

        if (paymentIntent.status === 'requires_capture' || paymentIntent.status === 'succeeded') {
          // 決済完了 → escrow に更新
          await db.collection('contracts').doc(contractId).update({
            status: 'escrow',
            escrowAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          console.log('  ✓ escrow に更新しました');
        } else {
          console.log(`  → 決済未完了のためスキップ (status: ${paymentIntent.status})`);
        }
      } catch (stripeError) {
        console.log(`  → Stripeエラー: ${stripeError.message}`);
      }
    }

    console.log('\n\n修正スクリプトが完了しました。');

  } catch (error) {
    console.error('エラーが発生しました:', error);
  }
}

// 実行
fixContractStatus().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
