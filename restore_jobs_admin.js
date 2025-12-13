// Firebase Admin SDK を使用したjobsコレクション復元スクリプト
const admin = require('firebase-admin');

// サービスアカウントキーのパスを指定（環境変数またはファイルから）
// gcloud auth application-default login で認証済みの場合は自動で認証される
admin.initializeApp({
  projectId: 'projectmarkethub-db904'
});

const db = admin.firestore();

// サンプルjobsデータ
const sampleJobs = [
  {
    id: 'job_project_001',
    clientId: 'test_client_001',
    clientName: 'テストクライアント',
    clientPhotoURL: '',
    title: '【プロジェクト方式】Webサイトのリニューアル',
    description: `## 概要
既存のコーポレートサイトをモダンなデザインにリニューアルしたいと考えています。

## 要件
- レスポンシブデザイン対応
- Next.js + Tailwind CSSでの実装
- お問い合わせフォームの設置
- ブログ機能の追加

## 納期
契約から2週間以内

## 予算
50,000円〜100,000円`,
    category: 'development',
    tags: ['Next.js', 'React', 'Tailwind CSS', 'Web制作'],
    type: 'project',
    budgetType: 'fixed',
    budget: 80000,
    deadline: admin.firestore.Timestamp.fromDate(new Date('2025-01-15')),
    status: 'open',
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now(),
    proposalCount: 0
  },
  {
    id: 'job_competition_001',
    clientId: 'test_client_001',
    clientName: 'テストクライアント',
    clientPhotoURL: '',
    title: '【コンペ方式】会社ロゴデザイン募集',
    description: `## 概要
新規事業のロゴデザインを募集します。

## コンセプト
- 信頼感のあるデザイン
- シンプルで覚えやすい
- 青系の色を希望

## 納品形式
- AI/EPS形式
- PNG形式（透過）
- 使用フォント情報

## 採用報酬
30,000円（税込）`,
    category: 'design',
    tags: ['ロゴデザイン', 'グラフィックデザイン', 'ブランディング'],
    type: 'competition',
    budgetType: 'fixed',
    budget: 30000,
    deadline: admin.firestore.Timestamp.fromDate(new Date('2025-01-10')),
    status: 'open',
    competition: {
      guaranteed: true,
      additionalPrizes: []
    },
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now(),
    proposalCount: 0
  },
  {
    id: 'job_task_001',
    clientId: 'test_client_001',
    clientName: 'テストクライアント',
    clientPhotoURL: '',
    title: '【タスク方式】簡単なアンケート回答',
    description: `## 概要
新サービスに関する簡単なアンケートにご回答ください。

## 所要時間
約5分

## 報酬
1件あたり100円

## 注意事項
- 1人1回のみ回答可能
- 不正回答は非承認となります`,
    category: 'survey',
    tags: ['アンケート', '簡単作業', '初心者歓迎'],
    type: 'task',
    budgetType: 'fixed',
    budget: 10000,
    deadline: admin.firestore.Timestamp.fromDate(new Date('2025-01-20')),
    status: 'open',
    task: {
      unitPrice: 100,
      quantity: 100,
      timeLimit: 30,
      questions: [
        {
          id: 'q1',
          type: 'radio',
          text: '年齢層を教えてください',
          options: ['10代', '20代', '30代', '40代', '50代以上'],
          required: true
        },
        {
          id: 'q2',
          type: 'checkbox',
          text: '興味のある分野を選んでください（複数選択可）',
          options: ['IT・テクノロジー', 'デザイン', 'マーケティング', 'ライティング', 'その他'],
          required: true
        },
        {
          id: 'q3',
          type: 'text',
          text: 'クラウドソーシングサービスに期待することを教えてください',
          required: false
        }
      ]
    },
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now(),
    proposalCount: 0
  },
  {
    id: 'job_project_002',
    clientId: 'test_client_001',
    clientName: 'テストクライアント',
    clientPhotoURL: '',
    title: '【プロジェクト方式】ECサイト構築',
    description: `## 概要
小規模なECサイトの構築をお願いします。

## 要件
- 商品登録機能
- カート機能
- 決済機能（Stripe連携）
- 管理画面

## 技術スタック
- Next.js
- Firebase
- Stripe

## 予算
150,000円〜200,000円`,
    category: 'development',
    tags: ['ECサイト', 'Next.js', 'Firebase', 'Stripe'],
    type: 'project',
    budgetType: 'fixed',
    budget: 180000,
    deadline: admin.firestore.Timestamp.fromDate(new Date('2025-02-01')),
    status: 'open',
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now(),
    proposalCount: 0
  },
  {
    id: 'job_competition_002',
    clientId: 'test_client_001',
    clientName: 'テストクライアント',
    clientPhotoURL: '',
    title: '【コンペ方式】新商品のネーミング募集',
    description: `## 概要
新しい健康食品のネーミングを募集します。

## 商品概要
- 青汁ベースの健康ドリンク
- ターゲット：30-50代の健康志向の方
- 毎日続けやすい味わい

## 希望するイメージ
- 健康的
- 親しみやすい
- 覚えやすい

## 採用報酬
10,000円`,
    category: 'writing',
    tags: ['ネーミング', 'コピーライティング', '商品企画'],
    type: 'competition',
    budgetType: 'fixed',
    budget: 10000,
    deadline: admin.firestore.Timestamp.fromDate(new Date('2025-01-08')),
    status: 'open',
    competition: {
      guaranteed: true,
      additionalPrizes: []
    },
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now(),
    proposalCount: 0
  }
];

async function restoreJobs() {
  console.log('Firestore jobsコレクションの復元を開始します（Admin SDK使用）...');
  
  for (const job of sampleJobs) {
    try {
      const { id, ...jobData } = job;
      await db.collection('jobs').doc(id).set(jobData);
      console.log(`✅ 作成完了: ${job.title}`);
    } catch (error) {
      console.error(`❌ エラー: ${job.title}`, error.message);
    }
  }
  
  console.log('\n復元が完了しました！');
  process.exit(0);
}

restoreJobs();
