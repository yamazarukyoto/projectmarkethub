# 関数管理表 (Function Tracking)

このファイルは、`★sekkei.md` (Ver 5.0) に基づき、プロジェクトで使用される主要な関数・APIエンドポイントを網羅的に記録したものです。

## 1. ユーザー管理 (User Management)
**File:** `src/lib/db.ts`

| 関数名 | 説明 | 引数 | 戻り値 | 関連仕様 |
| --- | --- | --- | --- | --- |
| `getUser` | ユーザー情報を取得 | `uid: string` | `Promise<User \| null>` | 3.1, 4.1 |
| `createUser` | 新規ユーザーを作成 | `user: User` | `Promise<void>` | 3.2.A |
| `updateUser` | ユーザー情報を更新 (基本情報、プロフィール等) | `uid: string`, `data: Partial<User>` | `Promise<void>` | 3.2.A, 3.2.B, 3.2.C |
| `updateVerificationStatus` | 本人確認ステータスを更新 | `uid: string`, `status: User["verificationStatus"]`, `reason?: string` | `Promise<void>` | 3.3 (3) |
| `updateStripeConnectId` | Stripe ConnectアカウントIDを紐付け | `uid: string`, `accountId: string` | `Promise<void>` | 3.3 (4) |
| `updateUserRating` | ユーザーの評価・レビュー数を更新 | `uid: string`, `rating: number`, `count: number` | `Promise<void>` | 2.1.9 |
| `getWorkers` | ワーカー一覧を取得 (スキルフィルタ対応) | `skill?: string` | `Promise<User[]>` | - |

## 2. 案件管理 (Job Management)
**File:** `src/lib/db.ts`

| 関数名 | 説明 | 引数 | 戻り値 | 関連仕様 |
| --- | --- | --- | --- | --- |
| `createJob` | 新規案件を作成 | `job: Omit<Job, "id">` | `Promise<string>` (Job ID) | 2.1.1, 2.2.1, 2.3.1 |
| `getJob` | 案件詳細を取得 | `jobId: string` | `Promise<Job \| null>` | 2.1.2 |
| `getJobs` | 案件一覧を取得 (カテゴリフィルタ) | `category?: string` | `Promise<Job[]>` | 2.1.2 |
| `getClientJobs` | クライアントの案件一覧を取得 | `clientId: string` | `Promise<Job[]>` | 2.1.1 |

## 3. 提案・応募管理 (Proposal Management)
**File:** `src/lib/db.ts`

| 関数名 | 説明 | 引数 | 戻り値 | 関連仕様 |
| --- | --- | --- | --- | --- |
| `createProposal` | 案件に応募/提案する | `proposal: Omit<Proposal, "id">` | `Promise<string>` (Proposal ID) | 2.1.2, 2.2.2 |
| `getProposal` | 提案詳細を取得 | `proposalId: string` | `Promise<Proposal \| null>` | - |
| `getProposals` | 特定案件の提案一覧を取得 | `jobId: string` | `Promise<Proposal[]>` | 2.1.3, 2.2.3 |
| `getWorkerProposals` | ワーカーの提案一覧を取得 | `workerId: string` | `Promise<Proposal[]>` | - |
| `updateProposalStatus` | 提案ステータスを更新 (採用/不採用等) | `proposalId: string`, `status: ProposalStatus` | `Promise<void>` | 2.2.3 |
| `addNegotiationMessage` | 交渉メッセージを追加 | `proposalId: string`, `message: { senderId: string; message: string; price?: number }` | `Promise<void>` | 2.1.3 |

## 4. 契約管理 (Contract Management)
**File:** `src/lib/db.ts`

| 関数名 | 説明 | 引数 | 戻り値 | 関連仕様 |
| --- | --- | --- | --- | --- |
| `createContract` | 契約を作成 (仮払い待ち状態) | `contract: Omit<Contract, "id">` | `Promise<string>` (Contract ID) | 2.1.4, 2.2.3 |
| `getContracts` | 契約一覧を取得 | `userId: string`, `userType: 'client' \| 'worker'` | `Promise<Contract[]>` | - |
| `updateContractStatus` | 契約ステータスを更新 | `contractId: string`, `status: ContractStatus` | `Promise<void>` | 2.1.5 - 2.1.9 |
| `submitContractDelivery` | 納品報告 (URL/メッセージ更新) | `contractId: string`, `deliveryFileUrl: string`, `deliveryMessage: string` | `Promise<void>` | 2.1.7, 2.2.4 |
| `updatePaymentIntentId` | 仮払い完了後にPaymentIntentIDを保存 | `contractId: string`, `paymentIntentId: string` | `Promise<void>` | 2.1.5 |

## 5. タスク作業管理 (Task Submission Management)
**File:** `src/lib/db.ts`

| 関数名 | 説明 | 引数 | 戻り値 | 関連仕様 |
| --- | --- | --- | --- | --- |
| `createTaskSubmission` | タスク作業を開始 (排他制御含む) | `submission: Omit<TaskSubmission, "id">` | `Promise<string>` (ID) | 2.3.2 |
| `getTaskSubmission` | 作業内容を取得 | `submissionId: string` | `Promise<TaskSubmission \| null>` | - |
| `getTaskSubmissionsByJob` | 案件の全作業提出を取得 | `jobId: string` | `Promise<TaskSubmission[]>` | 2.3.3 |
| `submitTaskAnswers` | タスク回答を提出 (完了) | `submissionId: string`, `answers: TaskSubmission["answers"]` | `Promise<void>` | 2.3.2 |
| `reviewTaskSubmission` | 作業を承認/非承認 | `submissionId: string`, `status: 'approved' \| 'rejected'`, `reason?: string` | `Promise<void>` | 2.3.3 |

## 6. 決済・Stripe (Payment System)
**File:** `src/lib/stripe.ts` / `src/app/api/...`

| 関数名/API | 説明 | 引数 | 戻り値 | 関連仕様 |
| --- | --- | --- | --- | --- |
| `createPaymentIntent` | 仮払い用のPaymentIntentを作成 | `amount: number`, `currency: string`, `metadata: Record<string, string>` | `Promise<Stripe.PaymentIntent>` | 2.1.5, 2.2.1, 2.3.1 |
| `capturePaymentIntent` | 決済を確定 (検収時) | `paymentIntentId: string`, `amount?: number` | `Promise<Stripe.PaymentIntent>` | 2.1.8, 2.2.5, 2.3.4 |
| `createTransfer` | 報酬を送金 (本払い) | `amount: number`, `destination: string`, `transferGroup: string`, `metadata: Record<string, string>` | `Promise<Stripe.Transfer>` | 2.4.2 |
| `createRefund` | 返金処理 | `paymentIntentId: string`, `amount?: number`, `metadata: Record<string, string>` | `Promise<Stripe.Refund>` | 2.4.3 |
| `createConnectAccount` | Stripe Connect Expressアカウント作成 | `email: string` | `Promise<Stripe.Account>` | 3.3 (4) |
| `createAccountLink` | Connect Onboardingリンク作成 | `accountId: string`, `refreshUrl: string`, `returnUrl: string` | `Promise<Stripe.AccountLink>` | 3.3 (4) |
| `createVerificationSession` | 本人確認セッション作成 | `userId: string`, `returnUrl: string` | `Promise<Stripe.Identity.VerificationSession>` | 3.3 (3) |
| `POST /api/stripe/webhook` | Stripe Webhook処理 | `Request` | `Response` | 5.3 |

## 7. 通知 (Notifications)
**File:** `src/lib/db.ts`

| 関数名 | 説明 | 引数 | 戻り値 | 関連仕様 |
| --- | --- | --- | --- | --- |
| `createNotification` | 通知を作成 | `notification: Omit<Notification, "id">` | `Promise<string>` | 5.4 |
| `getNotifications` | ユーザーの通知一覧を取得 | `userId: string` | `Promise<Notification[]>` | 5.4 |
| `markAsRead` | 通知を既読にする | `notificationId: string` | `Promise<void>` | - |

## 8. ストレージ (Storage)
**File:** `src/lib/storage.ts`

| 関数名 | 説明 | 引数 | 戻り値 | 関連仕様 |
| --- | --- | --- | --- | --- |
| `uploadFile` | ファイルをアップロード | `path: string`, `file: File` | `Promise<string>` (URL) | 2.1.7, 2.2.2, 3.3 (3) |
| `deleteFile` | ファイルを削除 | `path: string` | `Promise<void>` | - |
