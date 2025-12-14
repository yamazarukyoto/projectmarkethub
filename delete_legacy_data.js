// Firebase Admin SDK を使用したレガシーデータ削除スクリプト
const admin = require('firebase-admin');

// サービスアカウントキーのパスを指定（環境変数またはファイルから）
// gcloud auth application-default login で認証済みの場合は自動で認証される
admin.initializeApp({
  projectId: 'projectmarkethub-db904'
});

const db = admin.firestore();

async function deleteLegacyData() {
  console.log('レガシーデータの削除を開始します...');

  // 1. task_submissions コレクションの削除
  console.log('task_submissions コレクションを削除中...');
  const taskSubmissionsSnapshot = await db.collection('task_submissions').get();
  const taskBatch = db.batch();
  let taskCount = 0;
  taskSubmissionsSnapshot.forEach(doc => {
    taskBatch.delete(doc.ref);
    taskCount++;
  });
  if (taskCount > 0) {
    await taskBatch.commit();
    console.log(`✅ ${taskCount} 件の task_submissions を削除しました。`);
  } else {
    console.log('ℹ️ task_submissions は空でした。');
  }

  // 2. jobs コレクションから competition と task タイプのドキュメントを削除
  console.log('jobs コレクションから competition/task タイプを削除中...');
  const jobsSnapshot = await db.collection('jobs').where('type', 'in', ['competition', 'task']).get();
  const jobsBatch = db.batch();
  let jobsCount = 0;
  jobsSnapshot.forEach(doc => {
    jobsBatch.delete(doc.ref);
    jobsCount++;
  });
  if (jobsCount > 0) {
    await jobsBatch.commit();
    console.log(`✅ ${jobsCount} 件のレガシー jobs を削除しました。`);
  } else {
    console.log('ℹ️ 削除対象の jobs はありませんでした。');
  }

  // 3. contracts コレクションから competition と task タイプのドキュメントを削除
  console.log('contracts コレクションから competition/task タイプを削除中...');
  const contractsSnapshot = await db.collection('contracts').where('jobType', 'in', ['competition', 'task']).get();
  const contractsBatch = db.batch();
  let contractsCount = 0;
  contractsSnapshot.forEach(doc => {
    contractsBatch.delete(doc.ref);
    contractsCount++;
  });
  if (contractsCount > 0) {
    await contractsBatch.commit();
    console.log(`✅ ${contractsCount} 件のレガシー contracts を削除しました。`);
  } else {
    console.log('ℹ️ 削除対象の contracts はありませんでした。');
  }

  console.log('\n削除処理が完了しました！');
  process.exit(0);
}

deleteLegacyData();
