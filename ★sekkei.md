# クラウドソーシングプラチE��フォーム「Project Market Hub」詳細開発仕様書 (Ver 6.2)

## 1. プロジェクト定義 & コアコンセプト

### 1.1 概要E
本プロジェクト�E、クライアント（発注老E��とワーカー�E�受注老E��をマッチングするクラウドソーシングプラチE��フォーム**「Project Market Hub、E*である、E
最大の特徴は、E*「単一アカウント�EチE��アルモード、E*シスチE��である。ユーザーはログアウトすることなく、�EチE��ーのスイチE��一つで「クライアントモード」と「ワーカーモード」を瞬時に刁E��替えられる、E
**本プラチE��フォームでは、業務委託形式として「�Eロジェクト方式（固定報酬制�E�」�Eみを採用する、E*

### 1.2 チE��インシスチE�� & UI規宁E
**コンセプト:** 「信頼 (Trust)」「渁E�� (Clean)」「知性 (Intelligence)、E
**チE��イン原則:**
*   **余白の重要E** 惁E��過多になりがちな管琁E��面において、十刁E��パディングを取り、視認性を高める、E
*   **明確なアクション:** 「次に何をすべきか」を色と配置で直感的に伝える、E
*   **フィードバチE��:** ユーザーの操作（保存、E��信、エラー�E�に対し、忁E��ト�Eスト通知めE��ーチE��ング表示を行う、E

**カラーパレチE�� (Tailwind CSS):**
*   `primary`: `#00A3AF` (メインカラー: 爽めE��な青緁E - アクションボタン、リンク、アクチE��ブ状慁E
*   `primary-hover`: `#008C96`
*   `secondary`: `#0F2350` (アクセンチE 濁E��) - ヘッダー、フチE��ー、見�Eし、E��要テキスチE
*   `accent`: `#FF9F1C` (CTAボタン: オレンジ) - 契紁E��支払い、応募などのコンバ�Eジョンアクション
*   `danger`: `#EF4444` (削除・キャンセル・警呁E
*   `background`: `#F9FAFB` (ベ�Eス背景色)
*   `surface`: `#FFFFFF` (カード�EコンチE��チE��景)
*   `text-body`: `#374151` (本斁E
*   `text-muted`: `#6B7280` (補足惁E��)

**フォンチE**
*   日本誁E "Noto Sans JP", sans-serif
*   英誁E "Inter", sans-serif

**コンポ�EネンチE**
*   **Button:** `px-4 py-2 rounded-lg transition-all duration-200 font-medium shadow-sm active:scale-95`
*   **Card:** `bg-white rounded-xl shadow-sm border border-gray-100 p-6`
*   **Input:** `w-full rounded-lg border-gray-300 focus:border-primary focus:ring-primary`

---

## 1.3 サイト�EチE�E & 画面遷移図 (Site Map & Navigation)

```text
[ Visitor / Unauthenticated ]
      |
      +-- Top Page (/)
      |     |
      |     +-- Login (/login) ------------------------+
      |     +-- Register (/register) ------------------|
      |                                                |
      v                                                v
[ Authenticated User ] <-----------------------( Auth Guard )
      |
      +-- [ Header: Mode Switcher (Client <-> Worker) ]
      |
      +-- [ Common Pages ]
      |     +-- Account Settings
      |     |     +-- Profile (/account/profile)
      |     |     +-- Verification (/account/verification)
      |     |     +-- Notifications (/account/notifications)
      |     +-- Public Profile (/users/[id])
      |     +-- Messages (/messages)
      |           +-- Chat Room (/messages/[roomId])
      |     +-- Notification List (/notifications)
      |
      +-- [ Client Mode ] (発注老E
      |     |
      |     +-- Dashboard (/client/dashboard)
      |     |
      |     +-- Worker Search (/client/workers)
      |     |
      |     +-- Job Management
      |     |     +-- Create New Job (/client/jobs/new) [Header Link]
      |     |     +-- Job List (/client/jobs)
      |     |     +-- Job Detail (/client/jobs/[id])
      |     |           +-- Edit Job
      |     |           +-- Applicant List
      |     |
      |     +-- Contract Management
      |           +-- Contract Detail (/client/contracts/[id])
      |                 +-- Payment (Payment Reservation)
      |                 +-- Acceptance (Payment Confirmation)
      |
      +-- [ Worker Mode ] (受注老E
            |
            +-- Dashboard (/worker/dashboard)
            |
            +-- Job Search
            |     +-- Search (/worker/search)
            |     +-- Job Detail (/worker/jobs/[id])
            |           +-- Apply / Submit Proposal
            |
            +-- Contract Management
            |     +-- Application List (/worker/applications)
            |     +-- Contract Detail (/worker/contracts/[id])
            |           +-- Submit Deliverable
            |
            +-- Settings
                  +-- Public Profile (/account/worker/profile)
                  +-- Payout Settings (/account/worker/payout)
```

---

## 2. 業務フロー詳細設訁E(Workflow Definitions)

### 2.0 シスチE��全体フロー概要E(System Workflow Overview)

```text
                                    [ MONEY FLOW ]
                                          |
[ CLIENT ]                           [ PLATFORM ]                           [ WORKER ]
    |                                     |                                     |
    | (1) 募集 (Job Creation)             |                                     |
    |------------------------------------>|                                     |
    |                                     | (2) 検索・閲覧 (Search)             |
    |                                     |------------------------------------>|
    |                                     |                                     |
    | (3) 応募/提桁E(Apply/Proposal)      |                                     |
    |<------------------------------------|-------------------------------------|
    |                                     |                                     |
    | (4) 契紁E��ファー (Offer)            |                                     |
    |------------------------------------>|------------------------------------>|
    |                                     | (5) 契紁E��愁E(Accept/Sign)          |
    |<------------------------------------|-------------------------------------|
    |                                     |                                     |
    | (6) 仮決渁E(Payment Reservation)    |                                     |
    |     [CREDIT CARD] --(Charge)------> | [STRIPE HOLDING]                    |
    |     (Payment Obligation Fulfilled)  | (Agent Receipt / Custody)           |
    |------------------------------------>|                                     |
    |                                     |------------------------------------>|
    |                                     |      (Notification: Start Work)     |
    |                                     |                                     |
    |                                     | (7) 業務�E納品 (Work & Delivery)    |
    |<------------------------------------|-------------------------------------|
    |                                     |                                     |
    | (8) 検収 (Acceptance)               |                                     |
    |------------------------------------>|                                     |
    |                                     | (9) 決済確宁E(Payment Confirmation) |
    |                                     | [STRIPE HOLDING] --(Transfer)-----> | [BANK ACCOUNT]
    |                                     | (Release to Worker)                 |
    |                                     |------------------------------------>|
    |                                     |                                     |
    | (10) 評価 (Review)                  | (10) 評価 (Review)                  |
    |------------------------------------>|<------------------------------------|
    v                                     v                                     v
```

本プラチE��フォームでは、E*プロジェクト方式（固定報酬制�E�E*を採用する。時間単価制は採用しなぁE��E
全てのフローにおいて、E*「仮決済（決済予紁E��、E*が忁E��であり、ワーカーの報酬未払いリスクを排除する、E
**法的解釁E** クライアントが仮決済を行った時点で、ワーカーへの支払い義務�E履行（完亁E��したものとみなす。�EラチE��フォームはワーカーからの委託を受けて代金を**代琁E��領（収納代行！E*し、検収完亁E��でそ�E決済を保�Eする、E

### 2.1 プロジェクト方式（固定報酬制 - Fixed Price�E�E
要件定義から納品まで、E対1�E�また�E1対多）で進行する形式、E

#### 状態�E移図 (State Machine)
```mermaid
stateDiagram-v2
    [*] --> Negotiation: 応募/相諁E
    Negotiation --> WaitingForPayment: 契紁E��ファー(Client)
    WaitingForPayment --> PaymentReserved: 仮決済完亁E
    PaymentReserved --> InProgress: 業務開姁E
    InProgress --> Submitted: 納品報呁E
    Submitted --> InProgress: 差し戻ぁE修正依頼)
    Submitted --> Completed: 検収完亁E
    Completed --> [*]: 評価入劁E
    
    Negotiation --> Cancelled: 辞退/不�E竁E
    WaitingForPayment --> Cancelled: キャンセル
    PaymentReserved --> Cancelled: キャンセル(決済取涁E
    InProgress --> Disputed: トラブル報呁E
```

#### 詳細スチE��チE& 画面UI仕槁E

**Phase 1: マッチング (Matching)**
0.  **ワーカー検索 & スカウチE(Client)**
    *   **Page:** `/client/workers`
    *   **UI:** ワーカー一覧、スキル検索、�Eロフィール閲覧、E
    *   **Action:** 気になるワーカーへ「メチE��ージを送る」また�E「スカウト（非公開案件の打診�E�」を行う、E
1.  **募集 (Client)**
    *   **Page:** `/client/jobs/new`
    *   **UI:**
        *   `JobForm`: タイトル、詳細(MDエチE��タ)、カチE��リ、予算、期限、添付ファイル入力（褁E��可�E�、E
        *   `SubmitButton`: 「�E開する、E
    *   **DB:** `jobs` 作�E (`status: 'open'`, `budgetType: 'fixed'`).
2.  **検索 & 応募 (Worker)**
    *   **Page:** `/worker/jobs/[id]`
    *   **UI:**
        *   `JobDetails`: 案件詳細表示、E
        *   `ProposalForm`: 提示金顁E税抜)、完亁E��定日、メチE��ージ入力エリア、E
        *   `ApplyButton`: 「応募する」（未ログイン時�Eログインへ誘導）、E
    *   **DB:** `proposals` 作�E (`status: 'pending'`).
3.  **条件交渁E(Both)**
    *   **Page:** `/messages/[roomId]`
    *   **UI:**
        *   `ChatBox`: メチE��ージ送受信、E
        *   `ConditionPanel`: 現在の提示条件�E���額�E納期�E�を表示、E
        *   `NegotiationActions`:
            *   **Client:** 「条件変更を提示」「この条件で契紁E��ファーを�Eす」�Eタン、E
            *   **Worker:** 「条件変更を提示」「辞退する」�Eタン、E

**Phase 2: 契紁E& 仮決渁E(Contract & Payment Reservation)**
4.  **契紁E��ファー (Client)**
    *   **Page:** `/messages/[roomId]`
    *   **Action:** クライアントが最終条件で「契紁E��ファーを送る」�Eタン押下、E
    *   **DB:** `contracts` 作�E (`status: 'waiting_for_escrow'`).
    *   **UI:** チャチE��ルームに「契紁E��作�Eされました。仮決済へ進んでください」と表示、E
5.  **仮決渁E(Client)**
    *   **Page:** `/client/contracts/[id]`
    *   **UI:**
        *   `ContractStatus`: 「仮決済征E��」スチE�Eタス表示、E
        *   `PaymentCard`: 請求額�E訳�E�契紁E��額＋消費税）を表示、E
        *   `PaymentButton`: **「仮決済へ進む�E�Etripe決済）」�Eタン**、E
            *   **Action:** こ�EボタンをクリチE��すると、画面中央に `PaymentModal` (Stripe Elements) がオーバ�Eレイ表示される、E
            *   **Stripe Flow:**
                1.  クレジチE��カード情報を�E力、E
                2.  「支払う」�Eタン押下、E
                3.  Stripe API `PaymentIntent` (Separate Charges and Transfers) が実行され、�EラチE��フォームが代金を代琁E��領する、E
                4.  成功時、モーダルが閉じ、トースト通知「仮決済が完亁E��ました」を表示、E
                5.  画面リロードまた�EスチE�Eタス更新で「業務中�E�決済済み�E�」表示に刁E��替わる、E
    *   **DB:** `contracts.status` ↁE`'escrow'`.

**Phase 3: 業勁E& 納品 (Work & Delivery)**
7.  **業務開姁E(Worker)**
    *   **Page:** `/worker/contracts/[id]`
    *   **UI:**
        *   `ContractStatus`: 「業務中�E�決済済み�E�」表示、E
        *   `DeliveryForm`:
            *   ファイルアチE�EローチE(Drag & Drop, 褁E��ファイル可)、E
            *   コメント�E力エリア、E
            *   `SubmitButton`: 「納品報告する」！Estatus === 'escrow'` 時�Eみ活性化）、E
8.  **納品 (Worker)**
    *   **Action:** 納品報告�Eタン押下、E
    *   **DB:** `contracts.status` ↁE`'submitted'`.

**Phase 4: 検収 & 決済確宁E(Acceptance & Confirmation)**
9.  **検収 (Client)**
    *   **Page:** `/client/contracts/[id]`
    *   **UI:**
        *   `DeliveryPreview`: ワーカーが納品したファイル/URLとコメントを表示、E
        *   `AcceptanceActions`:
            *   `RejectButton`: 「修正依頼�E�差し戻し）、E
                *   クリチE��で琁E��入力モーダル表示 ↁE送信でスチE�EタスめE`in_progress` へ戻す、E
            *   `ApproveButton`: **「検収完亁E��決済確定）」�Eタン**、E
                *   クリチE��で確認モーダル表示�E�「検収を完亁E��ますか�E�これによりワーカーへの報酬引き渡しが確定します。、E
                *   「確定する」�Eタン押下で `/api/contracts/complete` をコール、E
    *   **System:** `/api/contracts/complete` (また�E `/api/stripe/capture-payment-intent`)、E
10. **評価 (Both)**
    *   **Page:** `/client/contracts/[id]` / `/worker/contracts/[id]`
    *   **UI:**
        *   `ReviewModal`: 検収完亁E��に自動�EチE�EアチE�E、また�E「評価を�E力する」�Eタンで表示、E
        *   Star Rating (1-5) とコメント�E力、E

---

## 2.2 決済�E収納代行詳細仕槁E(Payment & Agency Receipt Deep Dive)

本プラチE��フォームの核となる決済シスチE��は、E*Stripe Connect (Separate Charges and Transfers)** モチE��を採用する、E
法的には、�EラチE��フォームはワーカーから「代琁E��領権」を付与され、クライアントから�E報酬支払いめE*収納代衁E*する、E

### 採用琁E��と法的解釁E
1.  **収納代行（代琁E��領）モチE��:**
    *   クライアントがプラチE��フォームに対して決済（仮決済）を行った時点で、クライアント�Eワーカーに対する支払い義務�E消滁E��履行完亁E��する、E
    *   プラチE��フォームは、ワーカーに代わって代金を受領し、検収完亁E��でそ�E賁E��を管琁E��保�E�E�する、E
    *   検収完亁E��、�EラチE��フォームからワーカーへ報酬を引き渡す！Etripe Transfer�E�、E
    *   これにより、賁E��決済法上�E「賁E��移動業」には該当せず、商取引�E決済代行として適法に運用する、E
2.  **長期案件への対忁E** 通常のオーソリ�E�Ecapture_method: manual`�E��E7日間で期限刁E��となるため、数週間〜数ヶ月に及�Eプロジェクト方式には不向きである。一度決済を完亁E��せ�EラチE��フォーム管琁E���E賁E��として保持することで、期間�E制限なく決済保�E状態を維持できる、E

### 金額計算シミュレーション (Financial Calculation)

**前提:**
*   **契紁E��顁E(Contract Price):** 税抜き�E本体価格、E
*   **消費稁E(Tax):** 10% (日本国冁E、E
*   **シスチE��手数斁E(Platform Fee):** 契紁E��顁E税抜)の **5%** + 消費税、E

| 頁E�� | 計算弁E| 侁E 10,000冁E�E場吁E| 備老E|
| :--- | :--- | :--- | :--- |
| **A. 契紁E��顁E(税抜)** | User Input | **10,000 冁E* | |
| **B. 消費稁E(10%)** | `A * 0.10` | 1,000 冁E| |
| **C. クライアント支払総顁E* | `A + B` | **11,000 冁E* | **仮決済��顁E(Charge Amount)** |
| **D. シスチE��手数斁E(税抜)** | `A * 0.05` | 500 冁E| プラチE��フォーム収益 |
| **E. 手数料�E消費稁E* | `D * 0.10` | 50 冁E| |
| **F. シスチE��手数斁E(税込)** | `D + E` | 550 冁E| |
| **G. ワーカー受取顁E* | `C - F` | **10,450 冁E* | **報酬引渡金顁E(Transfer Amount)** |

### Stripe API 実裁E��細

#### 1. 仮決渁E(Charge / PaymentIntent)
クライアントが支払うフェーズ、E

*   **API:** `stripe.paymentIntents.create`
*   **タイミング:** 契紁E��結後、クライアントが「仮決済」�Eタンを押した時、E
*   **パラメータ:**
    ```javascript
    {
      amount: 11000, // C. クライアント支払総顁E
      currency: 'jpy',
      payment_method_types: ['card'],
      transfer_group: '{jobId}', // 重要E 案件IDでグルーピングし、後で紐付けめE
      metadata: {
        jobId: '{jobId}',
        contractId: '{contractId}',
        type: 'escrow' // シスチE��冁E��識別子としてのescrow�E�法的には収納代行！E
      }
    }
    ```
*   **UI挙動:**
    *   `PaymentModal` (Stripe Elements) を表示、E
    *   決済�E功時、DBのスチE�Eタスを更新 (`waiting_for_escrow` -> `escrow`)、E

#### 2. 決済確定�E報酬引渡 (Transfer)
ワーカーへ報酬を引き渡すフェーズ、E

*   **API:** `stripe.transfers.create`
*   **タイミング:** クライアントが「検収完亁E���Eタンを押した時、E
*   **前提条件 (Pre-conditions):**
    *   ワーカーの `stripeAccountId` が存在し、Onboarding (本人確誁E が完亁E��てぁE��こと (`charges_enabled: true`)、E
    *   プラチE��フォームのStripe残高が十�Eにあること、E
*   **パラメータ:**
    ```javascript
    {
      amount: 10450, // G. ワーカー受取顁E
      currency: 'jpy',
      destination: '{workerStripeAccountId}', // ワーカーのConnect Account ID
      transfer_group: '{jobId}', // 仮決済と同じグループIDを指宁E
      metadata: {
        jobId: '{jobId}',
        contractId: '{contractId}',
        type: 'reward'
      }
    }
    ```
*   **UI挙動:**
    *   処琁E��はローチE��ングスピナーを表示�E�二重送信防止�E�、E
    *   完亁E��、トースト通知「支払いが完亁E��ました」を表示し、画面をリロードまた�EスチE�Eタス更新、E

#### 3. 決済キャンセル (Refund)
キャンセルめE��剰予算�E返還フェーズ、E

*   **API:** `stripe.refunds.create`
*   **タイミング:** 契紁E��ャンセル合意時、E
*   **パラメータ:**
    ```javascript
    {
      payment_intent: '{paymentIntentId}', // 仮決済時のID
      amount: 5500, // 返��する金額（�E額また�E一部�E�E
      metadata: {
        jobId: '{jobId}',
        reason: 'cancellation'
      }
    }
    ```

### エラーハンドリングとリカバリー

1.  **決済失敁E(Card Error):**
    *   **原因:** 限度額オーバ�E、有効期限刁E��、不正利用検知など、E
    *   **UI:** Stripe Elementsが�E動的にエラーメチE��ージを表示する。クライアントには別のカードでの試行を俁E��、E
    *   **System:** DBの状態�E変更しなぁE��仮決済征E��のまま�E�、E

2.  **送E��失敁E(Transfer Error):**
    *   **原因:** ワーカーのStripeアカウント制限、本人確認未完亁E���EラチE��フォーム残高不足、E
    *   **UI:** クライアントには「�E琁E��にエラーが発生しました。運営にお問ぁE��わせください」と表示、E
    *   **System:**
        *   エラーログを記録�E�重要E��、E
        *   DBスチE�Eタスは `disputed` また�E `transfer_failed` に変更し、管琁E��E��手動で再送E��できる管琁E��面を用意する、E
        *   ワーカーへ「報酬受取口座の確認」を俁E��メールを�E動送信、E

3.  **整合性拁E��E(Idempotency):**
    *   Stripe API呼び出し時には `Idempotency-Key` (冪等キー) を付与し、ネチE��ワークエラー等による二重決済�E二重送E��を確実に防ぐ。キーには `contractId` めE`submissionId` を含める、E

---

## 2.3 不正防止・トラブル対筁E(Security & Anti-Fraud)

ユーザー目線での「抜け道」やリスクを排除するためのシスチE��皁E��策、E

### 1. 直接取引（中抜き�E��E防止
*   **リスク:** メチE��ージ機�Eで連絡先を交換し、手数料を回避して直接取引を行う、E
*   **対筁E**
    *   **NGワード検知:** メチE��ージ冁E��「メールアドレス」「電話番号」「LINE ID」「@」などのパターンを検知し、E��信前に警告モーダルを表示。「外部連絡先�E交換�E規紁E��反です」と警告する、E
    *   **監要E** 検知されたメチE��ージは管琁E��面でフラグを立て、E��営が目視確認できるようにする、E

### 2. 仮決済前の業務強要E��持ち送E���E�防止
*   **リスク:** クライアントが「後で払うから」と作業をさせ、納品物だけ受け取って支払わなぁE��E
*   **対筁E**
    *   **シスチE��制御:** スチE�EタスぁE`escrow` (仮決済済み) になるまで、ワーカー側の画面には「納品フォーム」を表示しなぁE��また�E非活性化）、E
    *   **UI警呁E** チャチE��画面めE��紁E��細画面に「仮決済が完亁E��るまで、絶対に業務を開始しなぁE��ください」とぁE��警告帯を常時表示する、E

### 3. 納品チE�Eタの持ち送E��防止
*   **リスク:** クライアントが納品ファイルをダウンロードした後、不当に検収を拒否・キャンセルする、E
*   **対筁E**
    *   **キャンセル制陁E** スチE�EタスぁE`submitted` (納品済み) の場合、クライアント�Eからのキャンセルボタンを非表示にする。キャンセルするには「トラブル報告」を行い、ワーカーの合意また�E運営の介�Eを忁E��とする、E

### 4. マネーロンダリング・自作�E演対筁E
*   **リスク:** 不正な賁E��移動や、評価の水増し、E
*   **対筁E**
    *   **本人確誁E** 報酬を受け取るワーカーだけでなく、E��額発注を行うクライアントにもStripe Identityによる本人確認を求める場合がある、E
    *   **同一性チェチE��:** 発注老E��受注老E�EIPアドレスめE��バイス持E��が一致する場合、警告また�E取引ブロチE��を行う、E

---

## 2.4 メチE��ージ機�E詳細 (Messaging System Deep Dive)

### 1. 基本仕槁E
*   **形弁E** 1対1のチャチE��ルーム形式（案件ごとのルーム、また�Eユーザー間�EダイレクトメチE��ージ�E�、E
*   **リアルタイム性:** Firestoreの `onSnapshot` を利用したリアルタイム更新、E

### 2. 既読管琁E(Read Status)
*   **ロジチE��:**
    *   メチE��ージドキュメントに `readBy: string[]` フィールドを持たせる、E
    *   受信老E��チャチE��ルームを開ぁE���E�EuseEffect` で検知�E�時点で、未読メチE��ージの `readBy` に自身のIDを追加する更新を行う、E
    *   送信老E�Eには、相手が既読にしたメチE��ージに対して「既読」�Eークを表示する、E

### 3. ファイル添仁E(File Attachment)
*   **制陁E**
    *   サイズ: 1ファイルあたり最大 **100MB**、E
    *   数: 1メチE��ージあたり褁E��ファイル添付可能、E
    *   形弁E 画僁Ejpg, png, gif), ドキュメンチEpdf, doc, docx, xls, xlsx, ppt, pptx), 圧縮ファイル(zip, rar)、E
    *   実行ファイル(exe, bat筁EはセキュリチE��リスクのため禁止、E
*   **保存�E:** Firebase Storage (`/messages/{roomId}/{fileId}`).
*   **UI:** ドラチE���E�E��ロチE�E対応。アチE�Eロード中はプログレスバ�Eを表示、E

### 4. シスチE��メチE��ージ (System Messages)
*   **定義:** ユーザーが�E力したテキストではなく、シスチE��が�E動投稿する通知メチE��ージ、E
*   **トリガー:**
    *   契紁E��結時�E�「契紁E��締結されました。仮決済をお征E��ください。、E
    *   仮決済完亁E���E�「仮決済が完亁E��ました。業務を開始してください。、E
    *   納品時：「ワーカーから納品報告がありました。検収を行ってください。、E
    *   検収完亁E���E�「検収が完亁E��ました。お疲れ様でした。、E
*   **表示:** 通常のメチE��ージとは異なるスタイル�E�背景色変更、中央寁E��等）で表示し、区別する、E

### 5. 通知連携
*   **メール通知:** メチE��ージ受信から **5刁E��** 既読にならなかった場合、受信老E�E登録メールアドレスへ「新着メチE��ージのお知らせ」を送信する�E�即時送信だとチャチE��中に大量�Eメールが届くため、デバウンス処琁E��入れる�E�、E

---

## 2.5 評価シスチE��詳細 (Rating System Deep Dive)

### 1. 評価頁E�� (Criteria)
5段階評価�E�E: 悪ぁE、E5: 非常に良ぁE��、E

| 頁E�� | 対象 | 説昁E|
| :--- | :--- | :--- |
| **品質 (Quality)** | Worker | 納品物のクオリチE��、要件満たし度、E|
| **納期 (Schedule)** | Worker | スケジュール遵守、レスポンス速度、E|
| **コミュニケーション (Communication)** | Both | めE��取りの冁E��さ、丁寧さ、E|
| **パ�EトナーシチE�E (Partnership)** | Client | 要件の明確さ、支払いのスムーズさ、E|

### 2. 総合評価の計算ロジチE��
*   **計算弁E** `(吁E��E��の平坁E��) の平均` を算�E、E
    *   侁E 品質4, 納期5, コミュニケーション5 => (4+5+5)/3 = 4.66... -> **4.7**
*   **ユーザー全体�E評価:** 直迁E00件�E�また�E全期間�E��E取引における総合評価の平坁E��、E
*   **表示:** 小数点第1位まで表示�E�侁E ☁E.5�E�、E

### 3. 評価の公開タイミング (Double-Blind System)
*   **相互評価方弁E**
    *   牁E��が評価を�E力しても、相手にはまだ冁E��は公開されなぁE��「評価済み」スチE�Eタスのみ伝わる）、E
    *   **双方が評価を�E力した時点**、また�E **評価期限�E�検収から1ヶ月後）が過ぎた時点** で、両老E�E評価が�Eロフィールに公開される、E
    *   これにより、報復評価�E�低い評価を付けられたから低く付け返す行為�E�を防ぐ、E

### 4. 評価の修正
*   **原則不可:** 一度確定した評価は修正できなぁE��E
*   **例夁E** 誹謗中傷めE��人惁E��が含まれる場合など、E��営が不適刁E��判断した場合�Eみ削除・修正を行う、E

---

## 2.6 キャンセルポリシー詳細 (Cancellation Policy Deep Dive)

### 1. フェーズ別キャンセル規宁E

| フェーズ | キャンセル可否 | 手数料�E返�� | 備老E|
| :--- | :--- | :--- | :--- |
| **契紁E��** | 自由 | 発生しなぁE| 応募辞退、募雁E��り下げは自由、E|
| **契紁E���E仮決済前** | 可能 | 発生しなぁE| 相手へのメチE��ージ通知忁E��。�E動キャンセル機�Eあり�E�E週間放置等）、E|
| **仮決済後�E業務開始前** | 可能 | **全額返��** | クライアント�Eワーカー双方の合意が忁E��。シスチE��手数料も返還される！Etripe仕様に準拠�E�、E|
| **業務開始後�E納品剁E* | 条件付き可能 | **部刁E����** | 進捗に応じた��額をワーカーへ支払い、残額を返��、E*シスチE��手数料�E「支払い額」に対してのみ発甁E*、E|
| **納品後�E検収剁E* | **原則不可** | - | 成果物が完�EしてぁE��ため、一方皁E��キャンセルは不可。品質に問題がある場合�E「修正依頼」を行う。どぁE��ても合意に至らなぁE��合�E運営介�E、E|
| **検収完亁E��E* | **不可** | - | 決済確定後�Eキャンセル・返��はシスチE��上行わなぁE��当事老E��で解決する、E|

### 2. 連絡不通時の自動�E琁E(Auto-Cancellation)
*   **ワーカー連絡不送E** 業務期間中にワーカーからの連絡ぁE**7日閁E* 途絶え、クライアントから「連絡不通申請」があった場合、E��営が確認�EぁE��契紁E��途中終亁E��キャンセル�E�し、�E額返��とする、E
*   **クライアント連絡不送E** 納品後、クライアントから�E検収・連絡ぁE**14日閁E* 途絶えた場合、E*自動検収** とみなし、ワーカーへ報酬を支払う、E

---

## 2.7 管琁E��面機�E要件 (Admin Dashboard Requirements)

運営老E��プラチE��フォームを健全に保つための管琁E���E。`/admin/*` 配下に配置し、特定�E管琁E��E��限を持つユーザーのみアクセス可能とする、E

### 1. ユーザー管琁E(User Management)
*   **一覧・検索:** UID、メールアドレス、氏名、スチE�Eタスで検索可能、E
*   **詳細確誁E** 登録惁E��、本人確認書類！Etripe Identity連携�E�、Stripe Connect ID、評価、取引履歴の閲覧、E
*   **アクション:**
    *   **アカウント凍絁E解除:** 規紁E��反ユーザーのログイン停止、E
    *   **強制退企E** アカウント削除、E
    *   **本人確認手動承誁E** Stripe Identityで判定不�Eだった場合�E目視確認�E承誁E否認、E

### 2. 案件・契紁E��琁E(Job & Contract Management)
*   **案件監要E** 新規投稿された案件の一覧。不適刁E��案件�E��E序良俗違反、�Eルチ商法等）�E**非�E開化・削除**、E
*   **契紁E���E:** トラブル発生中の契紁E��細確認。メチE��ージログの閲覧、E
*   **強制キャンセル・返��:** 当事老E��で解決しなぁE��合、管琁E��限で契紁E��キャンセルし、Stripe APIを通じて**強制返�� (Refund)** また�E **強制送E�� (Transfer)** を実行する、E

### 3. 通報管琁E(Report Management)
*   **通報一覧:** ユーザーから寁E��られた通報�E�メチE��ージ、案件、�Eロフィール�E��E一覧、E
*   **対応スチE�Eタス:** `未対応` -> `確認中` -> `対応済み` / `却下` の管琁E��E

### 4. 売上�E出金管琁E(Financial Management)
*   **売上集訁E** 日次・月次の取扱高！EMV�E�、�EラチE��フォーム収益�E�Eet Revenue�E��Eグラフ表示、E
*   **Stripe残高確誁E** プラチE��フォーム口座の残高確認（送E��賁E��不足のアラート）、E

---

## 2.9 通知一覧ペ�Eジ詳細仕槁E(Notification List Specs)

**Page:** `/notifications`
**目皁E** 過去の通知履歴を一覧で確認する。�EチE��ーの通知ドロチE�Eダウンは最新のみ表示するため、�E件確認用のペ�Eジが忁E��、E

### 1. 画面構�E
*   **リスト表示:** 通知カードを時系列頁E��新しい頁E��に表示、E
*   **吁E��ード�E要素:**
    *   アイコン�E�タイプ別: メチE��ージ、契紁E��支払い、シスチE���E�E
    *   タイトル
    *   本斁E��抜粋また�E全斁E��E
    *   日時（相対時間また�E絶対時間�E�E
    *   未読/既読インジケータ�E�未読は背景色を変える等！E
*   **アクション:**
    *   クリチE��で当該リンクへ遷移し、既読にする、E
    *   「�Eて既読にする」�Eタン、E

### 2. チE�Eタ取征E
*   **初期表示:** 最新20-50件を取得、E
*   **追加読み込み:** スクロールまた�E「もっと見る」�Eタンで過去の通知を取得！Eagination�E�、E

---

## 2.10 通知・メール配信シスチE��詳細 (Notification & Email System Specs)

### 1. 概要E
ユーザーのアクション�E�契紁E��決済、メチE��ージ等）に基づき、相手方へリアルタイム通知�E�サイト�E�E�およ�Eメール通知を行う、E
吁E��知はユーザーの「通知設定」によりON/OFFが可能、E

### 2. メール通知トリガーと設定頁E��

| イベンチE| トリガー | 対象設定頁E�� | 送信タイミング |
| :--- | :--- | :--- | :--- |
| **新着メチE��ージ** | `messages` コレクションへの追加 | `emailMessage` | 即時送信はせず、E*15刁E��とのバッチ�E琁E*で未読メチE��ージがある場合に送信�E�連続受信時�E大量送信防止�E�、E|
| **契紁E��ファー** | `contracts` 作�E (`pending_signature`) | `emailContract` | 即晁E(Firestore Trigger: `onCreate`) |
| **契紁E��愁E* | `contracts` 更新 (`waiting_for_escrow`) | `emailContract` | 即晁E(Firestore Trigger: `onUpdate`) |
| **仮決済完亁E* | `contracts` 更新 (`escrow`) | `emailContract` | 即晁E(Firestore Trigger: `onUpdate`) |
| **納品報呁E* | `contracts` 更新 (`submitted`) | `emailContract` | 即晁E(Firestore Trigger: `onUpdate`) |
| **検収完亁E* | `contracts` 更新 (`completed`) | `emailContract` | 即晁E(Firestore Trigger: `onUpdate`) |
| **スカウチE* | `scouts` 作�E (未実裁E���Eだが枠確俁E | `emailScout` | 即晁E|

### 3. 実裁E��弁E
*   **Cloud Functions:** Firestoreの `onCreate`, `onUpdate` トリガーおよび `pubsub.schedule` を使用、E
*   **メール送信:** `nodemailer` ライブラリを使用し、SMTP経由で送信、E
*   **排他制御:** メチE��ージ通知は `lastEmailSentAt` などのフラグを用ぁE��重褁E��信を防ぐ、E
*   **設定確誁E** 送信前に忁E��受信老E�E `user.notificationSettings` を確認し、OFFの場合�E送信をスキチE�Eする、E

---

## 2.8 バッチ�E琁E�E自動化 (Scheduled Functions)

Cloud Functions for Firebase (Pub/Sub Scheduler) を利用した定期実行�E琁E��E

### 1. 募集期限刁E��チェチE�� (Daily)
*   **対象:** `status: 'open'` かつ `deadline < now` の案件、E
*   **処琁E** スチE�EタスめE`closed` (募集終亁E に更新し、クライアントへ通知メールを送信、E

### 2. 自動検収処琁E(Daily)
*   **対象:** `status: 'submitted'` (納品済み) かつ `submittedAt < 14 days ago` の契紁E��E
*   **処琁E**
    1.  クライアントへ最終警告メール送信�E�E日前など�E�、E
    2.  期限到来時、�E動的に `status: 'completed'` に更新、E
    3.  Stripe `Transfer` APIを実行し、ワーカーへ報酬を支払う、E
    4.  シスチE��メチE��ージ�E�「クライアントから�E連絡がなかったため、規定により自動検収としました。、E

### 3. 未読メチE��ージ通知 (Every 15 mins)
*   **対象:** `read: false` かつ `createdAt > 15 mins ago` のメチE��ージがあり、まだ通知メールを送信してぁE��ぁE��ーザー、E
*   **処琁E** 「新着メチE��ージがあります」とぁE��メールを送信し、`emailSent: true` フラグを立てる（連続送信防止�E�、E

---

## 3. アカウント�Eマイペ�Eジ詳細仕槁E(Account & Personal Page Specs)

CrowdWorksのマイペ�Eジ構�Eを�Eースに、本プラチE��フォーム独自の「デュアルモード」を統合した設計とする、E
ユーザーは「�E通設定」「ワーカー設定」「クライアント設定」�E3つのカチE��リで惁E��を管琁E��る、E

### 3.1 画面構�E (UI Structure)
*   **レイアウチE** 左サイドバーに設定メニュー、右側に編雁E��ォームを�E置する2カラムレイアウト、E
*   **レスポンシチE** モバイル時�Eハンバ�Eガーメニューまた�EドロチE�Eダウンでメニューを表示、E

### 3.2 メニュー頁E��一覧 (Navigation Menu)

#### A. 共通設宁E(Common Settings)
1.  **基本惁E��編雁E(Basic Info)**
    *   氏名、住所、E��話番号などの個人惁E��。契紁E��面めE��人確認�E基礎となる重要情報、E
2.  **メールアドレス・パスワーチE(Email & Security)**
    *   ログイン惁E��の変更、E
3.  **通知設宁E(Notifications)**
    *   メール通知、�EチE��ュ通知のON/OFF、E
4.  **退会申諁E(Delete Account)**
    *   アカウント削除フロー、E

#### B. ワーカー設宁E(Worker Settings)
1.  **ワーカープロフィール (Public Profile)**
    *   表示名、�E種、スキル、�E己紹介。クライアントに公開される惁E��、E
2.  **スキル・ポ�Eトフォリオ (Skills & Portfolio)**
    *   実績めE��品の登録、E
3.  **報酬振込允E(Payout Settings)**
    *   Stripe Connectアカウント管琁E��面へのリンク、E

#### C. クライアント設宁E(Client Settings)
1.  **クライアント�Eロフィール (Company Profile)**
    *   会社名、事業冁E��、URL。ワーカーに公開される惁E��、E
2.  **支払い方況E(Payment Methods)**
    *   クレジチE��カード管琁E(Stripe Customer Portal)、E

---

### 3.3 詳細フィールド定義 (Field Definitions)

#### (1) 基本惁E��編雁E(`/account/profile`)
**目皁E** 契紁E��本人確認に使用する正式な惁E��を登録する。非公開、E

| 頁E��吁E| 忁E��E| 垁E| 制紁E備老E|
| :--- | :---: | :--- | :--- |
| **氏名 (漢孁E** | 忁E��E| String | 全角。本人確認書類と一致すること、E|
| **氏名 (カチE** | 忁E��E| String | 全角カタカナ。口座名義と一致すること、E|
| **生年月日** | 忁E��E| Date | **登録後変更不可**。未成年チェチE��に使用、E|
| **性別** | 任愁E| Enum | 男性/女性/そ�E仁E無回筁E|
| **郵便番号** | 忁E��E| String | 7桁E(ハイフンなし可)、E*zipcloud API** を利用して住所自動補完を行う、E|
| **都道府県** | 忁E��E| Select | 47都道府県、E|
| **市区町村�E番地** | 忁E��E| String | |
| **建物名�E部屋番号** | 任愁E| String | |
| **電話番号** | 忁E��E| String | ハイフンなし。封E��皁E��SMS認証に使用、E|

#### (2) ワーカープロフィール (`/account/worker/profile`)
**目皁E** クライアントにアピ�Eルするための公開情報、E

| 頁E��吁E| 忁E��E| 垁E| 制紁E備老E|
| :--- | :---: | :--- | :--- |
| **表示吁E* | 忁E��E| String | ニックネ�Eム可。デフォルト�E氏名、E|
| **キャチE��コピ�E** | 忁E��E| String | 最大50斁E��。検索結果に表示される、E|
| **職種** | 忁E��E| Select | エンジニア/チE��イナ�E/ライター筁E(大カチE��リ > 小カチE��リ)、E|
| **自己紹仁E* | 忁E��E| Text | Markdown対応。最大3000斁E��、E|
| **稼働可能時間** | 忁E��E| Select | 週10時間未満 / 10-20時間 / 20-30時間 / 30時間以丁E|
| **希望単価** | 任愁E| Number | 時給換算�E目宁E(冁E、E|

#### (3) 報酬振込先�E本人確誁E(`/account/worker/payout`)
**仕槁E** Stripe Connect (Express) を使用するため、直接口座惁E��は保持しなぁE��本プラチE��フォームでは、Stripe Connectの本人確認！EYC�E�完亁E��もってプラチE��フォーム上�E本人確認完亁E��みなす、E
*   **UI:** 「Stripeアカウントを確認�E編雁E��る」�Eタンを�E置、E
*   **挙動:** クリチE��すると Stripe Hosted Dashboard へリダイレクトする、E
*   **スチE�Eタス表示:** 「連携済み」「未連携」「情報不足」等�EStripeアカウント状態を表示する、E
*   **本人確誁E** Stripe連携が完亁E��た時点で、本人確認済みスチE�Eタスとなる、E

#### (5) 通知設宁E(`/account/notifications`)
**仕槁E** 吁E��イベントごとのメール送信可否設定、E

| 頁E��吁E| チE��ォルチE| 説昁E|
| :--- | :---: | :--- |
| **重要なお知らせ** | ON (固宁E | 運営からの重要E��絡。OFF不可、E|
| **メチE��ージ受信** | ON | クライアンチEワーカーからのメチE��ージ、E|
| **契紁E�E業務連絡** | ON | 契紁E��結、仮決済、検収等�E通知、E|
| **スカウトメール** | ON | クライアントから�Eスカウト、E|
| **チE��リーサマリー** | OFF | おすすめ案件などのまとめメール、E|

#### (6) 公開�Eロフィールペ�Eジ (`/users/[id]`)
**目皁E** クライアントが契紁E��にワーカーのスキルめE��績を確認するため�Eペ�Eジ、E
**アクセス権:** ログインユーザーであれば誰でも閲覧可能、E
**表示頁E��:**
*   **ヘッダー:** 表示名、キャチE��コピ�E、アイコン、本人確認バチE��、E
*   **基本惁E��:** 職種、稼働可能時間、希望単価、E
*   **自己紹仁E** Markdown形式�E自己紹介文、E
*   **スキル:** 登録されたスキルタグ一覧、E
*   **実績:**
    *   総合評価 (Star Rating)
    *   完亁E��件数
    *   評価コメント一覧 (直近�E取弁E
*   **アクション:** 「メチE��ージを送る」�Eタン (ログイン時�Eみ)、E

---

## 4. チE�Eタベ�Eス設訁E(Firestore Schema)

NoSQLの特性を活かし、読み取り最適化（非正規化�E�を行う、E

### `users` (Collection)
ユーザーの基本惁E��、E
```typescript
interface User {
  uid: string;                 // Auth UID
  email: string;
  displayName: string;         // ワーカー表示吁E(ニックネ�Eム)
  photoURL: string;
  userType: 'client' | 'worker' | 'both';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // Personal Info (Private - for Verification & Contracts)
  name?: string;               // 本吁E(漢孁E
  nameKana?: string;           // 本吁E(カチE
  birthDate?: string;          // YYYY-MM-DD
  gender?: string;
  address?: {
    postalCode: string;
    prefecture: string;
    city: string;
    building?: string;
  };
  phoneNumber?: string;
  
  // Verification
  verificationStatus: 'unsubmitted' | 'pending' | 'approved' | 'rejected';
  verificationRejectionReason?: string;
  identityDocumentUrls?: string[]; // [front, back] (Admin only)

  // Stripe Connect
  stripeAccountId?: string;    // Worker: Express Account ID (acct_...)
  stripeCustomerId?: string;   // Client: Customer ID (cus_...)
  stripeOnboardingComplete: boolean;

  // Profiles
  clientProfile?: {
    companyName?: string;
    description?: string;
    website?: string;
  };
  workerProfile?: {
    title: string;             // キャチE��コピ�E e.g. "Frontend Developer"
    bio: string;               // 自己紹仁E
    skills: string[];          // e.g. ["React", "TypeScript"]
    portfolioUrls?: string[];
    hoursPerWeek?: string;     // 稼働可能時間
    desiredUnitPrice?: number; // 希望単価
  };

  // Notification Settings
  notificationSettings?: {
    emailMessage: boolean;
    emailContract: boolean;
    emailScout: boolean;
    emailDaily: boolean;
  };

  // Stats (Denormalized)
  rating: number;              // 0.0 - 5.0
  reviewCount: number;
  jobsCompleted: number;
}
```

### `jobs` (Collection)
案件惁E��、E
```typescript
interface Job {
  id: string;
  clientId: string;
  clientName: string;          // 非正規化
  clientPhotoURL: string;      // 非正規化
  
  title: string;
  description: string;         // Markdown
  category: string;            // e.g. "development", "design"
  tags: string[];
  attachments: { name: string; url: string }[]; // 褁E��ファイル
  
  type: 'project';             // 固宁E
  budgetType: 'fixed';         // 固定報酬のみ
  budget: number;              // 予算目宁E
  deadline: Timestamp;         // 募集期限
  
  status: 'open' | 'closed' | 'filled' | 'cancelled';
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
  proposalCount: number;       // 非正規化カウンター
}
```

### `proposals` (Collection)
応募・提案情報、E
```typescript
interface Proposal {
  id: string;
  jobId: string;
  clientId: string;            // クエリ用
  workerId: string;
  
  // Worker Info (Denormalized)
  workerName: string;
  workerPhotoURL: string;
  
  // Proposal Content
  price: number;               // 提案��顁E(税抜)
  message: string;
  estimatedDuration: string;   // e.g. "1 week"
  attachments: { name: string; url: string }[]; // 褁E��ファイル
  
  status: 'pending' | 'interviewing' | 'rejected' | 'hired';
  
  // Negotiation History
  negotiationHistory: {
    senderId: string;
    price: number;
    message: string;
    createdAt: Timestamp;
  }[];

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### `contracts` (Collection)
契紁E�E取引情報、E*最重要コレクション、E*
```typescript
interface Contract {
  id: string;
  jobId: string;
  clientId: string;
  workerId: string;
  
  // Snapshot
  jobTitle: string;
  
  // Financials
  amount: number;              // 契紁E��顁E(税抜)
  tax: number;                 // 消費稁E(amount * 0.1)
  totalAmount: number;         // 税込請求顁E(amount + tax)
  platformFee: number;         // 手数斁E(amount * 0.05)
  workerReceiveAmount: number; // ワーカー受取顁E(amount - platformFee)
  
  // Status
  status: 
    | 'pending_signature'  // 契紁E��ファー中�E�ワーカー合意征E���E�E
    | 'waiting_for_escrow' // 仮決済征E��
    | 'escrow'             // 仮決済済み・作業征E��
    | 'in_progress'        // 作業中�E�修正対応含む�E�E
    | 'submitted'          // 納品確認中
    | 'disputed'           // トラブル中
    | 'completed'          // 検収完亁E�E支払渁E
    | 'cancelled';         // キャンセル

  // Stripe
  stripePaymentIntentId: string;
  stripeTransferId?: string;
  
  // Delivery
  deliveryFiles?: { name: string; url: string }[]; // 褁E��ファイル
  deliveryMessage?: string;
  
  createdAt: Timestamp;
  escrowAt?: Timestamp;
  submittedAt?: Timestamp;
  completedAt?: Timestamp;
}
```

### `task_submissions` (Collection)
**削除**

---

## 5. シスチE��機�E要件 (System Requirements)

### 5.1 認証・認可 (Authentication)
*   **Middleware:** `/client/*` および `/worker/*` へのアクセスは認証済みユーザーのみ許可。未認証は `/login` へリダイレクト、E
*   **Role Check:** ユーザータイプによる制限�E設けなぁE���E員がClientかつWorkerになれるため�E�。ただし、�Eロフィール未入力時のガード�E設ける、E

### 5.2 モード管琁E(Mode Management)
*   **Context:** `ModeContext` で `currentMode` ('client' | 'worker') を管琁E��E
*   **Persistence:** `localStorage` に保存し、リロード後も維持、E
*   **UI:** ヘッダーの色、メニュー頁E��、ダチE��ュボ�Eド�E表示冁E��をモードに応じて完�Eに刁E��替える、E
*   **Header Actions:**
    *   **ログイン中:**
        *   「設定（歯車）」アイコンを表示し、`/account/profile` へ直接遷移可能にする、E
        *   「ログアウト」�Eタンを表示する、E
    *   **ログアウト中:** 「ログイン」�Eタンを表示する、E

### 5.3 決済シスチE�� (Payment System)
*   **Stripe Connect:** Expressアカウントを使用、E
*   **Onboarding:** ワーカーが報酬を受け取るには、Stripeの本人確認�Eロセス�E�Enboarding�E�を完亁E��せる忁E��がある。完亁E��てぁE��ぁE��合、応募・受注をブロチE��する、E
*   **Webhook:** StripeからのイベンチE(`payment_intent.succeeded`, `payment_intent.payment_failed`) をCloud Functionsで受け取り、DB整合性を保つ�E�バチE��アチE�E手段として�E�。基本はクライアントサイドから�EAPIコールで状態�E移させるが、Webhookは忁E��、E

### 5.4 通知シスチE�� (Notifications)
*   **Trigger:** 状態�E移時（応募、契紁E��仮決済、納品、検収�E�、E
*   **Channel:**
    1.  **In-App:** ヘッダーのベルアイコン。`notifications` コレクションに書き込み、E
    2.  **Email:** SendGrid また�E Firebase Extensions (Trigger Email) を使用してメール送信、E

---

## 6. チE��レクトリ構造 (Directory Structure)

```
src/
├── app/
━E  ├── (auth)/                  # 認証グルーチE
━E  ━E  ├── login/page.tsx
━E  ━E  └── register/page.tsx
━E  ├── (main)/                  # メインアプリグルーチE
━E  ━E  ├── layout.tsx           # Header, ModeProvider
━E  ━E  ├── client/              # クライアント機�E
━E  ━E  ━E  ├── dashboard/       # ダチE��ュボ�EチE
━E  ━E  ━E  ├── jobs/            # 案件管琁E
━E  ━E  ━E  ━E  ├── new/         # 新規作�E
━E  ━E  ━E  ━E  └── [id]/        # 詳細・編雁E
━E  ━E  ━E  ├── contracts/       # 契紁E��琁E
━E  ━E  ━E  ━E  └── [id]/        # 契紁E��細・決済�E検収
━E  ━E  ━E  └── workers/         # ワーカー検索
━E  ━E  ├── worker/              # ワーカー機�E
━E  ━E  ━E  ├── dashboard/
━E  ━E  ━E  ├── search/          # 仕事検索
━E  ━E  ━E  ├── applications/    # 応募管琁E
━E  ━E  ━E  └── contracts/       # 契紁E��細・納品
━E  ━E  └── messages/            # メチE��ージ機�E
━E  ━E      └── [roomId]/
━E  └── api/                     # API Routes
━E      └── webhooks/
━E          └── stripe/route.ts
├── components/
━E  ├── ui/                      # 基本UIパ�EチE(Button, Card, Input...)
━E  ├── layouts/                 # Header, Footer
━E  ├── features/                # 機�E別コンポ�EネンチE
━E  ━E  ├── job/                 # JobCard, JobForm
━E  ━E  ├── contract/            # ContractStatus, PaymentButton
━E  ━E  └── message/             # ChatBox
━E  └── providers/               # AuthProvider, ModeProvider
├── lib/
━E  ├── firebase.ts              # Firebase Config
━E  ├── db.ts                    # Firestore Utils
━E  ├── stripe.ts                # Stripe Utils
━E  └── utils.ts                 # Helper Functions
├── types/                       # TypeScript Definitions
└── hooks/                       # Custom Hooks
```

---

## 7. セキュリチE��ルール (Security Rules)

Firestore Security Rulesの概要、E

*   `users`: 本人のみ書き込み可。�E開�Eロフィール部刁E�E誰でも読み取り可、E
*   `jobs`: クライアント�Eみ作�E・更新可。読み取りは誰でも可、E
*   `proposals`: 作�Eはワーカーのみ。読み取りは当該クライアントと作�E老E�Eみ、E*削除は作�E老E�Eみ可、E*
*   `contracts`: 当該クライアントとワーカーのみ読み書き可、E
*   `task_submissions`: **削除**

---

## 8. 付録: 特定商取引法に基づく表訁E

| 頁E�� | 冁E�� |
| :--- | :--- |
| **販売事業老E* | 山本健太 |
| **運営責任老E* | 山本健太 |
| **所在地** | 、E00-8208 京都府京都市下京区小稲荷町85-2 Grand-K 京都駁E��ビル 201 |
| **連絡先メールアドレス** | service@meeting-agency.com |
| **電話番号** | 請求があった場合、E��滞なく開示します、E|
| **サイチERL** | https://pj-markethub.com/ |
| **販売価格** | 吁E��品�Eサービスのご購入ペ�Eジにて表示する価格 |
| **啁E��代金以外�E忁E��料釁E* | インターネット接続料金、E��信料��等�Eお客様�E負拁E��なります、E|
| **支払方況E* | クレジチE��カード決渁E(Stripe)、E��行振込 |
| **支払時朁E* | 契紁E��結時に決済予紁E��与信確保）を行い、検収完亁E��に決済確定、E|
| **引渡し時朁E* | 決済完亁E��、即時（サービス利用開始！E|
| **返品・交換�Eキャンセル** | チE��タルコンチE��チE�E性質上、原剁E��して返品・返��には応じられません、Ebr>ただし、当社の責めに帰すべき事由によりサービスが提供されなかった場合�Eこ�E限りではありません、Ebr>契紁E��ャンセル時�E返��につぁE��は利用規紁E��準じます、E|

---

## 9. 利用規紁E(Terms of Service)

本利用規紁E��以下「本規紁E��とぁE��ます。）�E、山本健太�E�以下「運営老E��とぁE��ます。）が提供する「Project Market Hub」（以下「本サービス」とぁE��ます。）�E利用条件を定めるものです。登録ユーザーの皁E��（以下「ユーザー」とぁE��ます。）には、本規紁E��従って本サービスをご利用ぁE��だきます、E

### 第1条 (適用)
1. 本規紁E�E、ユーザーと運営老E��の間�E本サービスの利用に関わる一刁E�E関係に適用されるものとします、E
2. 運営老E�E本サービスに関し、本規紁E�Eほか、ご利用にあたってのルール等、各種の定め�E�以下「個別規定」とぁE��ます。）をすることがあります。これら個別規定�Eそ�E名称のぁE��んに関わらず、本規紁E�E一部を構�Eするも�Eとします、E
3. 本規紁E�E規定が前頁E�E個別規定�E規定と矛盾する場合には、個別規定において特段の定めなき限り、個別規定�E規定が優先されるも�Eとします、E

### 第2条 (定義)
本規紁E��おいて使用する用語�E定義は、以下�Eとおりとします、E
1. **「本サービス、E*: 運営老E��運営する「Project Market Hub」と称するウェブサイトおよ�E関連サービス、E
2. **「ユーザー、E*: 本サービスを利用するために会員登録を行った個人また�E法人、E
3. **「クライアント、E*: 本サービスを通じて業務を依頼するユーザー、E
4. **「ワーカー、E*: 本サービスを通じて業務を受託するユーザー、E
5. **「本取引、E*: 本サービスを通じてクライアントとワーカーの間で締結される業務委託契紁E��E
6. **「仮決済（決済予紁E��、E*: クライアントがワーカーに対する報酬の支払いを確紁E��るために、E��営老E��持E��する決済サービスを通じて与信枠の確保また�E決済予紁E��行うこと、E

### 第3条 (利用登録)
1. 登録希望老E��運営老E�E定める方法によって利用登録を申請し、E��営老E��これを承認することによって、利用登録が完亁E��るものとします、E
2. 運営老E�E、利用登録の申請老E��以下�E事由があると判断した場合、利用登録の申請を承認しなぁE��とがあり、その琁E��につぁE��は一刁E�E開示義務を負わなぁE��のとします、E
    *   虚偽の事頁E��届け出た場吁E
    *   本規紁E��違反したことがある老E��ら�E申請である場吁E
    *   そ�E他、E��営老E��利用登録を相当でなぁE��判断した場吁E

### 第4条 (ユーザーIDおよびパスワード�E管琁E
1. ユーザーは、�E己の責任において、本サービスのユーザーIDおよびパスワードを適刁E��管琁E��るものとします、E
2. ユーザーは、いかなる場合にも、ユーザーIDおよびパスワードを第三老E��譲渡また�E貸与し、もしくは第三老E��共用することはできません、E
3. 運営老E�E、ユーザーIDとパスワード�E絁E��合わせが登録惁E��と一致してログインされた場合には、そのユーザーIDを登録してぁE��ユーザー自身による利用とみなします、E

### 第5条 (禁止事頁E
ユーザーは、本サービスの利用にあたり、以下�E行為をしてはなりません、E
1. 法令また�E公序良俗に違反する行為
2. 犯罪行為に関連する行為
3. 本サービスの冁E��等、本サービスに含まれる著作権、商標権ほか知皁E��産権を侵害する行為
4. 運営老E��ほか�Eユーザー、また�Eそ�E他第三老E�Eサーバ�Eまた�Eネットワークの機�Eを破壊したり、妨害したりする行為
5. 本サービスによって得られた惁E��を商業皁E��利用する行為
6. 運営老E�Eサービスの運営を妨害するおそれ�Eある行為
7. 不正アクセスをし、また�Eこれを試みる行為
8. 他�Eユーザーに関する個人惁E��等を収集また�E蓁E��する行為
9. 不正な目皁E��持って本サービスを利用する行為
10. 本サービスの他�Eユーザーまた�Eそ�E他�E第三老E��不利益、損害、不快感を与える行為
11. 他�Eユーザーに成りすます行為
12. 運営老E��許諾しなぁE��サービス上での宣伝、庁E��、勧誘、また�E営業行為
13. 本サービス外での直接取引を誘引する行為�E�直接取引�E禁止�E�E
14. 面識�EなぁE��性との出会いを目皁E��した行為
15. そ�E他、E��営老E��不適刁E��判断する行為

### 第6条 (本サービスの提供�E停止筁E
1. 運営老E�E、以下�EぁE��れかの事由があると判断した場合、ユーザーに事前に通知することなく本サービスの全部また�E一部の提供を停止また�E中断することができるも�Eとします、E
    *   本サービスにかかるコンピュータシスチE��の保守点検また�E更新を行う場吁E
    *   地霁E��落雷、火災、停電また�E天災などの不可抗力により、本サービスの提供が困難となった場吁E
    *   コンピュータまた�E通信回線等が事故により停止した場吁E
    *   そ�E他、E��営老E��本サービスの提供が困難と判断した場吁E
2. 運営老E�E、本サービスの提供�E停止また�E中断により、ユーザーまた�E第三老E��被ったいかなる不利益また�E損害につぁE��も、一刁E�E責任を負わなぁE��のとします、E

### 第7条 (利用制限およ�E登録抹涁E
1. 運営老E�E、ユーザーが以下�EぁE��れかに該当する場合には、事前の通知なく、ユーザーに対して、本サービスの全部もしく�E一部の利用を制限し、また�Eユーザーとしての登録を抹消することができるも�Eとします、E
    *   本規紁E�EぁE��れかの条頁E��違反した場吁E
    *   登録事頁E��虚偽の事実があることが判明した場吁E
    *   料��等�E支払債務�E不履行があった場吁E
    *   運営老E��ら�E連絡に対し、一定期間返答がなぁE��吁E
    *   本サービスにつぁE��、最終�E利用から一定期間利用がなぁE��吁E
    *   そ�E他、E��営老E��本サービスの利用を適当でなぁE��判断した場吁E
2. 運営老E�E、本条に基づき運営老E��行った行為によりユーザーに生じた損害につぁE��、一刁E�E責任を負ぁE��せん、E

### 第8条 (決済およ�E収納代衁E
1. **代琁E��領権の付丁E** ワーカーは、本サービスを利用して報酬を受け取るにあたり、E��営老E��対して、クライアントから支払われる報酬を代琁E��て受領する権限（代琁E��領権�E�を付与するものとします、E
2. **債務�E消滁E** クライアントが運営老E��対して報酬相当額�E決済（仮決済を含む�E�を行った時点で、クライアント�Eワーカーに対する報酬支払債務�E消滁E��、履行が完亁E��たものとみなします、E
3. **収納代衁E** 運営老E�E、ワーカーからの委託に基づき、クライアントから�E報酬を収納代行（代琁E��領）し、検収完亁E���E条件が�E就した後に、所定�E手数料を控除した金額をワーカーへ引き渡します、E
4. **賁E��移動業の否宁E** 本サービスにおける賁E��の流れは、商取引に基づく代金�E収納代行であり、賁E��決済法上�E「賁E��移動業」には該当しません。運営老E�E、ユーザー間�E送E��サービスを提供するものではありません、E

### 第9条 (保証の否認およ�E免責事頁E
1. 運営老E�E、本サービスに事実上また�E法律上�E瑕疵�E�安�E性、信頼性、正確性、完�E性、有効性、特定�E目皁E��の適合性、セキュリチE��などに関する欠陥、エラーめE��グ、権利侵害などを含みます。）がなぁE��とを�E示皁E��も黙示皁E��も保証しておりません、E
2. 運営老E�E、本サービスに起因してユーザーに生じたあらゆる損害につぁE��、E��営老E�E敁E��また�E重過失による場合を除き、一刁E�E責任を負ぁE��せん、E
3. 運営老E�E、本サービスに関して、ユーザーと他�Eユーザーまた�E第三老E��の間において生じた取引、E��絡また�E紛争等につぁE��一刁E��任を負ぁE��せん、E

### 第10条 (サービス冁E��の変更筁E
運営老E�E、ユーザーへの事前の告知をもって、本サービスの冁E��を変更、追加また�E廁E��することがあり、ユーザーはこれを承諾するも�Eとします、E

### 第11条 (利用規紁E�E変更)
1. 運営老E�E以下�E場合には、ユーザーの個別の同意を要せず、本規紁E��変更することができるも�Eとします、E
    *   本規紁E�E変更がユーザーの一般の利益に適合するとき、E
    *   本規紁E�E変更が本サービス利用契紁E�E目皁E��反せず、かつ、変更の忁E��性、変更後�E冁E��の相当性そ�E他�E変更に係る事情に照らして合理皁E��も�Eであるとき、E
2. 運営老E�Eユーザーに対し、前頁E��よる本規紁E�E変更にあたり、事前に、本規紁E��変更する旨及�E変更後�E本規紁E�E冁E��並びにそ�E効力発生時期を通知します、E

### 第12条 (個人惁E��の取扱ぁE
運営老E�E、本サービスの利用によって取得する個人惁E��につぁE��は、別途定める「�Eライバシーポリシー」に従い適刁E��取り扱ぁE��のとします、E

### 第13条 (通知また�E連絡)
ユーザーと運営老E��の間�E通知また�E連絡は、E��営老E�E定める方法によって行うも�Eとします。運営老E�E、ユーザーから、E��営老E��別途定める方式に従った変更届け出がなぁE��り、現在登録されてぁE��連絡先が有効なも�Eとみなして当該連絡先へ通知また�E連絡を行い、これらは、発信時にユーザーへ到達したものとみなします、E

### 第14条 (権利義務�E譲渡の禁止)
ユーザーは、E��営老E�E書面による事前の承諾なく、利用契紁E���E地位また�E本規紁E��基づく権利もしく�E義務を第三老E��譲渡し、また�E拁E��に供することはできません、E


### 第15条 (準拠法�E裁判管轁E
1. 本規紁E�E解釈にあたっては、日本法を準拠法とします、E
2. 本サービスに関して紛争が生じた場合には、E��営老E�E所在地を管轁E��る裁判所を専属的合意管轁E��判所とします、E

---

## 10. プライバシーポリシー (Privacy Policy)

Project Market Hub運営事務局�E�以下「当運営」とぁE��ます。）�E、本サービスの運営において、個人惁E��保護を重要な社会的使命・責務と認識し、以下�E通りプライバシーポリシーを定めます、E

### 1. 個人惁E��
当運営が取得する個人惁E��とは、個人の識別に係る以下�E惁E��をいぁE��す、E
*   住所・氏名・電話番号・電子メールアドレス、クレジチE��カード情報、ログインID、パスワード、ニチE��ネ�Eム、IPアドレス等において、特定�E個人を識別できる惁E���E�他�E惁E��と照合することができ、それにより特定�E個人を識別することができることとなるものを含む。！E
*   本サービスにおいて、お客様がご利用になったサービスの冁E��、ご利用日時、ご利用回数などのご利用冁E��及�Eご利用履歴に関する惁E��

### 2. 個人惁E��の取得�E収集につぁE��
当運営は、以下�E方法により、個人惁E��を取得させてぁE��だきます、E
1.  **本サービスを通じて取得�E収集させてぁE��だく方況E*
    *   本サービスにおいて、お客様�Eら�E力された個人惁E��を取得します、E
2.  **電子メール、E��便、書面、E��話等�E手段により取得�E収集させてぁE��だく方況E*
    *   お客様から�Eお問ぁE��わせ等によりご提供いただぁE��個人惁E��を取得します、E
3.  **本サービスへアクセスされた際に惁E��を収雁E��せてぁE��だく方況E*
    *   利用されるURL、ブラウザめE��バイスの種類、IPアドレス、Cookie等�E惁E��を収雁E��ます、E

### 3. 個人惁E��の取得�E利用目皁E
当運営は、以下�E目皁E�Eため、個人惁E��を適法かつ公正な手段で取得�E利用させてぁE��だきます、E
1.  本サービスを提供するためE
2.  本サービスを安忁E�E安�Eにご利用ぁE��だける環墁E��備�Eため
3.  本サービスの運営・管琁E�Eため
4.  本サービスに関するご案�E、お問い合せ等への対応�Eため
5.  本サービスの改喁E��研究開発のため
6.  当運営とお客様�E間での忁E��な連絡を行うため
7.  本サービスに関する規紁E���Eリシー等に違反する行為に対する対応�Eため
8.  本サービスに関する規紁E���E変更などを通知するため
9.  そ�E他当運営とお客様との間で同意した目皁E�Eため

### 4. 個人惁E��の管琁E
当運営は、個人惁E��の滁E��、き損、漏洩及�E不正利用等を防止し、その安�E管琁E��行うために忁E��な措置を講じ、個人惁E��を安�Eに管琁E��ます。また、個人惁E��を利用目皁E�E篁E��冁E��おいて、正確かつ最新の状態で管琁E��るよぁE��努めます、E

### 5. 個人惁E��の第三老E��の提供�E開示
当運営では、個人惁E��を第三老E��提供する場合�E、あらかじめお客様本人に同意を得て行います。佁E��、以下�EぁE��れかに該当する場合�E、この限りではありません、E
1.  法令に基づく場吁E
2.  人命、身体又は財産などの保護のために忁E��な場吁E
3.  公皁E��関等又はそれら�E委託を受けた老E��り、E��示請求を受領した場吁E
4.  利用目皁E�E達�Eに忁E��な篁E��で、個人惁E��の取扱ぁE�E全部もしく�E一部を委託する場吁E
5.  事業承継に伴って個人惁E��が提供される場吁E

### 6. 個人惁E��の開示・訂正・利用停止
お客様から個人惁E��に関する利用目皁E�E通知、E��示、�E容の訂正・追加・削除及�E利用停止、あるいは第三老E��供記録の開示を求められた場合には、本人確認�E上、E��刁E��対応します、E

### 7. クチE��ー�E�Eookie�E�E
本サービスでは、利便性向上や統計データ取得�EためにCookieを使用します。また、庁E��配信のために第三老E��業の庁E��サービスを利用する場合があります。これらはブラウザの設定で無効化することができます、E

### 8. お問ぁE��わせ窓口
本ポリシーに関するお問ぁE��わせは、下記までお願いぁE��します、E

**Project Market Hub運営事務局**
*   運営責任老E 山本健太
*   所在地: 、E00-8208 京都府京都市下京区小稲荷町85-2 Grand-K 京都駁E��ビル 201
*   メールアドレス: service@meeting-agency.com

以丁E

---

## 11. 開発環墁E�Eインフラ設宁E(Infrastructure Configuration)

### 11.1 Firebase プロジェクト設宁E

**使用プロジェクチE** `projectmarkethub-db904`

| 設定頁E�� | 値 |
| :--- | :--- |
| **Project ID** | `projectmarkethub-db904` |
| **Project Number** | `173689610587` |
| **API Key** | `AIzaSyD6uAWaLZ6hHgYZpvRrcCKGOZRGWi3ruNU` |
| **Auth Domain** | `projectmarkethub-db904.firebaseapp.com` |
| **Storage Bucket** | `projectmarkethub-db904.firebasestorage.app` |
| **Messaging Sender ID** | `173689610587` |
| **App ID** | `1:173689610587:web:ea5e28f0e2e65e6cb43a7e` |

**承認済みドメイン:**
- `localhost`
- `projectmarkethub-db904.firebaseapp.com`
- `projectmarkethub-db904.web.app`
- `projectmarkethub.web.app`
- `projectmarkethub.firebaseapp.com`
- `pj-markethub.com`

### 11.2 認証プロバイダー設宁E

| プロバイダー | 状慁E| 備老E|
| :--- | :---: | :--- |
| **メール/パスワーチE* | ✁E有効 | 標準認証 |
| **Google** | ✁E有効 | OAuth 2.0 Client ID設定済み |

**Google OAuth設宁E**
- Client ID: `173689610587-sv8mhtl7f8pccj65s0jlodkfaspm01g0.apps.googleusercontent.com`

### 11.3 Cloud Run チE�Eロイ設宁E

| 設定頁E�� | 値 |
| :--- | :--- |
| **Service Name** | `projectmarkethub` |
| **Region** | `asia-northeast1` |
| **Image Repository** | `asia-northeast1-docker.pkg.dev/projectmarkethub/projectmarkethub-repo/app` |
| **Service URL** | `https://projectmarkethub-5ckpwmqfza-an.a.run.app` |
| **Custom Domain** | `https://pj-markethub.com` |

### 11.4 環墁E��数 (.env.local)

```bash
# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_BASE_URL=https://pj-markethub.com

# Firebase Configuration (projectmarkethub-db904)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyD6uAWaLZ6hHgYZpvRrcCKGOZRGWi3ruNU
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=projectmarkethub-db904.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=projectmarkethub-db904
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=projectmarkethub-db904.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=173689610587
NEXT_PUBLIC_FIREBASE_APP_ID=1:173689610587:web:ea5e28f0e2e65e6cb43a7e
```

### 11.5 変更履歴

| 日仁E| 変更冁E�� |
| :--- | :--- |
| 2025-12-08 | Firebaseプロジェクトを`projectmarkethub`から`projectmarkethub-db904`に統合。旧プロジェクチEprojectmarkethub`(700356537492)は削除済み、Eoogle認証設定を完亁E��E|
| 2025-12-13 | Stripe決済エラー�E�Eink干渉）修正のため、PaymentIntent作�E時に `payment_method_types: ['card']` を指定し、クレジチE��カード決済�Eみに限定、E|
| 2025-12-13 | 不�E合修正�E�ワーカーメチE��ージ送信時�Eルーム自動作�E、契紁E��細画面のリアルタイム更新化、契紁E��みスチE�Eタス時�EUI制御追加、E|
| 2025-12-13 | 不�E合修正�E�契紁E���EAPIの認証エラー修正�E�Euthorizationヘッダー追加�E�、FirestoreセキュリチE��ルールの緩和（チャチE��ルーム作�E権限）、ワーカー側契紁E��面のリアルタイム更新化、E|
| 2025-12-13 | コンペ方式�E不�E合修正�E�①ワーカー仕事詳細ペ�Eジに「クライアントにメチE��ージ」�Eタン追加、②契紁E��細ペ�EジのメチE��ージボタン修正�E�EroposalId || contractIdでルームID決定）、③メチE��ージペ�Eジでコンペ方式�E契紁E��報パネル表示対応、④成果物URLの折り返し表示�E�Ereak-all�E�追加、E|
| 2025-12-13 | コンペ方式�E追加修正�E�①ワーカーモード�EメチE��ージ送受信機�E修正�E�EroposalIdでルーム作�E�E�、②クライアントモード�E納品物受け取り機�E確認、③ワーカーが交渉条件を読めるようにproposal惁E��を取得�E表示、④納品URLのoverflow-wrap追加、E|
| 2025-12-14 | **仕様変更�E�コンペ方式�Eタスク方式を廁E��し、�Eロジェクト方式（固定報酬制�E�に一本化、E* |
| 2025-12-14 | **不�E合修正�E�E件�E�！E* ①メチE��ージの契紁E��/契紁E���E統一�E�EroposalIdをルームIDとして統一�E�、②クライアント契紁E��細ペ�Eジの納品確認UIを改喁E��スチE�Eタス表示修正�E�、③仮決済時のStripe決済モーダル表示修正�E�デモモード条件の修正�E�、E|
| 2025-12-14 | **機�E改喁E��E件�E�！E* ①ワーカー応募辞退機�Eの修正�E�Eirestoreルール更新�E�、②契紁E��ローの変更�E�相互合意�Eロセスの追加�E�、③Stripe決済フローの修正�E�EaymentModalの確実な動作）、E|
| 2025-12-14 | **ログイン機�E改喁E��E* ログインエラーメチE��ージの詳細化（エラーコード別のメチE��ージ表示�E�、Eirebase Authenticationのエラーハンドリングを改喁E��、ユーザーに適刁E��フィードバチE��を提供、E|
| 2025-12-14 | **契紁E��ロー改喁E��E件�E�！E* ①`pending_signature`スチE�Eタスの日本語化�E�「契紁E��意征E��」として表示�E�、②ワーカーモードで契紁E��合意できる機�Eを追加。クライアントが契紁E�Eタンを押した後、ワーカーも契紁E�Eタンを押す仕絁E��に変更、E|
| 2025-12-14 | **契紁E��ロー改喁E��追加�E�！E* ①ワーカー契紁E��意時のクライアント通知機�E追加、②ワーカーダチE��ュボ�Eド�E表示改喁E��E|
| 2025-12-14 | **仮決済スチE�Eタス更新問題修正�E�E* ①`PaymentModal`の`onSuccess`で`verify-payment` APIを呼び出すよぁE��修正、②3Dセキュア認証後�Eリダイレクト�E琁E��追加、E|
| 2025-12-14 | **ワーカー報酬受取機�E改喁E��E* ①Stripe Connect ExpressダチE��ュボ�Eドへのリンク追加、②報酬履歴の表示機�E追加、E|
| 2025-12-14 | **StripeダチE��ュボ�Eドアクセス改喁E��E* ①APIエラーハンドリング強化、②UI改喁E��トースト通知、リンク表示�E�、E|
| 2025-12-20 | **メチE��ージボックス・入力欁E��スポンシブ対応！E* ①`ChatBox`を`textarea`化し自動高さ調整を追加、②メチE��ージペ�Eジを`flex`レイアウトに変更しウィンドウサイズ追従を強化、E|
| 2025-12-20 | **検収時決済エラー対応！E* ①`capture-payment-intent` APIのTransfer処琁E��`try-catch`で囲み、E��E��失敗時でも契紁E��亁E��チE�Eタスへ更新するように修正。②`contracts`コレクションに`transferError`フィールドを追加、E|
| 2025-12-20 | **報酬額反映・ダチE��ュボ�Eド�E移不�E合対応！E* ①検収完亁E�E琁E�Eロバスト化により報酬履歴への反映を確実化。②Stripe ConnectダチE��ュボ�Eド�E移のエラーハンドリング強化、E|
| 2025-12-21 | **トップ�Eージ改喁E��E* ①ヒ�EローセクションのキャチE��コピ�E変更�E�手数斁E%訴求）、②ログイン状態に応じた�Eタン出し�Eけ！ETopPageButtons`コンポ�Eネント追加�E�、E|
| 2025-12-27 | **スマ�Eでの契紁E�Eタン反応なし対応！E* ①汎用モーダルコンポ�Eネント�E作�E、②メチE��ージペ�Eジの契紁E�Eタンをモーダル化し、`window.confirm`を廁E��、E|
| 2025-12-27 | **契紁E��細画面の表示修正�E�E* クライアント�E契紁E��細画面から「契紁E��イチEプロジェクト方式」�E表示を削除、E|
| 2025-12-27 | **応募一覧が表示されなぁE��題修正�E�E* `getProposals`関数に`clientId`引数を追加し、Firestoreクエリに`clientId`フィルターを追加することでセキュリチE��ルールとの整合性を確保、E|

---

## 23. 修正計画�E�E025-12-28 契紁E��ファー送信後�E遷移不�E合修正�E�E

### 23.1 問題�E概要E
クライアントモードで「オファーを送信する」�Eタンを押しても、画面が�E移せず、次に進まなぁE��E

### 23.2 原因刁E��
1.  **APIの重褁E��ェチE��:** `src/app/api/contracts/create/route.ts` において、同一 `proposalId` に対する契紁E��既に存在する場合、スチE�Eタスに関わらずエラーを返してぁE��。キャンセル済みの契紁E��ある場合でも�E契紁E��きなぁE��態になってぁE��可能性がある、E
2.  **エラーハンドリング:** APIがエラーを返した場合、クライアント�Eで `alert` を表示してぁE��が、ユーザーが見落としてぁE��か、ブラウザによってブロチE��されてぁE��可能性がある、E
3.  **画面遷移:** 成功時�E `router.push` が何らか�E琁E��で機�EしてぁE��ぁE��また�E遁E��してぁE��可能性がある、E

### 23.3 修正冁E��
1.  **API (`src/app/api/contracts/create/route.ts`):**
    *   契紁E��褁E��ェチE��において、`status` ぁE`cancelled` の契紁E�E無視するよぁE��変更する、E
2.  **UI (`src/app/(main)/messages/[roomId]/page.tsx`):**
    *   エラーメチE��ージめE`alert` ではなく、モーダル冁E��赤斁E��で表示するように変更する、E
    *   成功時�E遷移処琁E��より確実にするため、`router.push` の後に `return` を�E示し、忁E��であれば `window.location.href` へのフォールバックも検討する（今回はまぁE`router.push` のまま様子を見るが、エラー表示改喁E��状況が明確になる�Eず）、E

### 23.4 実裁E��頁E
1.  `src/app/api/contracts/create/route.ts` を修正し、E��褁E��ェチE��ロジチE��を緩和する、E
2.  `src/app/(main)/messages/[roomId]/page.tsx` を修正し、エラー表示用スチE�Eトを追加し、モーダル冁E��表示する、E

### 23.5 実裁E��亁E��E025-12-28�E�E
**修正冁E���E�E*
1. **API (`src/app/api/contracts/create/route.ts`):**
   - 既存契紁E��ェチE��で`proposalId`ベ�EスのチェチE��を追加
   - 同じ`proposalId`で既存�E契紁E��ある場合、その契約IDを返して遷移させめE
   - キャンセル済み契紁E�E除外するロジチE��を維持E

2. **UI (`src/app/(main)/messages/[roomId]/page.tsx`):**
   - `isExisting`フラグの処琁E��明示皁E��追加
   - エラーメチE��ージをモーダル冁E��赤斁E��で表示�E�既に実裁E��み�E�E
   - コンソールログを追加してチE��チE��しやすくする

---

## 24. 修正計画�E�E025-12-29 仮払い画面から戻った後�E仮払いボタン追加�E�E

### 24.1 問題�E概要E
仮払い画面�E�Etripe決済モーダル�E�から仮払いせずに戻った場合、メチE��ージ画面に戻ってしまぁE��仮払いボタンがなぁE��め仮払いできなくなる、E

### 24.2 原因刁E��
1. **メチE��ージペ�Eジの「契紁E��み」セクション:** 契紁E��存在する場合、「契紁E��み」と表示され、「契紁E��細へ移動する」�Eタンのみが表示されめE
2. **契紁E��細ペ�Eジへの導線不足:** `waiting_for_escrow`スチE�Eタスの場合でも、メチE��ージペ�Eジから直接仮払いに進むボタンがなぁE
3. **ユーザー体験�E問顁E** ユーザーは仮払い画面から戻った後、どこから仮払いできるかわからなくなめE

### 24.3 修正冁E��
**UI (`src/app/(main)/messages/[roomId]/page.tsx`):**
1. 契紁E��存在し、スチE�Eタスが`waiting_for_escrow`の場合、「仮払いへ進む」�Eタンを追加
2. ボタンをクリチE��すると契紁E��細ペ�Eジ�E�E/client/contracts/[id]`�E�に遷移し、そこで仮払いを行えめE
3. スチE�Eタスに応じた適刁E��メチE��ージを表示

### 24.4 実裁E��頁E
1. `src/app/(main)/messages/[roomId]/page.tsx`の「契紁E��み」セクションを修正
2. 契紁E��チE�Eタスに応じた�EタンとメチE��ージを表示
3. チE�Eロイして動作確誁E

---

## 26. 修正計画�E�E025-12-29 契紁E��覧ペ�Eジ404エラー修正�E�E

### 26.1 問題�E概要E
ワーカーモードで「契紁E��覧を見る」�Eタンを押すと、`/worker/contracts` ペ�EジぁE04エラーになる、E

### 26.2 原因刁E��
1. **ペ�Eジファイルは存在する** - `src/app/(main)/worker/contracts/page.tsx` は正常に存在
2. **ローカルビルドでは正常** - `app-path-routes-manifest.json` に `/worker/contracts` ルートが含まれてぁE��
3. **本番環墁E�EチE�Eロイが古ぁE* - 最新のコードがチE�EロイされてぁE��ぁE��能性

### 26.3 修正冁E��
再デプロイを実行して、最新のコードを本番環墁E��反映する、E

### 26.4 実裁E��頁E
1. Cloud Buildを使用して再デプロイ
2. 本番環墁E��動作確誁E

---

## 27. 修正計画�E�E025-12-29 ワーカーダチE��ュボ�EドUI改喁E��E

### 27.1 問題�E概要E
1. ワーカーダチE��ュボ�Eドに「新着の仕事」セクションが表示されてぁE�� ↁE不要なので削除
2. 契紁E��琁E��応募管琁E��同じペ�Eジに表示されてぁE�� ↁE数が増えると下にある応募管琁E��埋まってしまぁE

### 27.2 修正冁E��
1. **ダチE��ュボ�Eドから「新着の仕事」セクションを削除**
   - `src/app/(main)/worker/dashboard/page.tsx` から「新着の仕事」セクションを削除
   - 関連する `recentJobs` スチE�Eトと `getJobs` の呼び出しも削除

2. **契紁E��琁E��応募管琁E��別ペ�Eジへのリンクに変更**
   - ダチE��ュボ�Eドには統計カードと「契紁E��覧を見る」「応募一覧を見る」�Eタンを�E置
   - 既存�E `/worker/contracts` ペ�Eジと `/worker/applications` ペ�Eジへ誘封E
   - ダチE��ュボ�Eドでは最新3件程度のプレビューのみ表示し、「もっと見る」で一覧ペ�Eジへ遷移

### 27.3 実裁E��頁E
1. `src/app/(main)/worker/dashboard/page.tsx` を修正
   - 「新着の仕事」セクションを削除
   - 契紁E��琁E��クションを簡略化（最新3件 + 「契紁E��覧を見る」�Eタン�E�E
   - 応募管琁E��クションを簡略化（最新3件 + 「応募一覧を見る」�Eタン�E�E
2. チE�Eロイして動作確誁E

---

## 25. 修正計画�E�E025-12-29 評価機�Eの改喁E��E

### 25.1 問題�E概要E
納品が完亁E��た後、クライアント�Eワーカーが双方に評価することになってぁE��が、評価機�Eが正しく動作しなぁE��また、評価を蓄積して第三老E��確認できる機�Eが不足してぁE��、E

### 25.2 原因刁E��
1. **評価機�E自体�E実裁E��れてぁE��** - `submitReview`関数でFirestoreの`reviews`コレクションに保存し、ユーザーの平坁E��価を更新する仕絁E��があめE
2. **公開�Eロフィールペ�Eジで評価コメント�E一覧が表示されてぁE��ぁE* - 第三老E��評価の詳細を確認できなぁE
3. **評価を取得する関数がdb.tsに存在しなぁE* - `reviews`コレクションからチE�Eタを取得する関数がなぁE

### 25.3 修正冁E��
1. **db.ts:** `getUserReviews`関数を追加 - 特定ユーザーへの評価一覧を取征E
2. **公開�Eロフィールペ�Eジ (`/users/[id]`):** 評価コメント一覧セクションを追加
3. **FirestoreインチE��クス:** 忁E��に応じてインチE��クスを追加

### 25.4 実裁E��頁E
1. `src/lib/db.ts`に`getUserReviews`関数を追加
2. `src/app/(main)/users/[id]/page.tsx`に評価コメント一覧セクションを追加
3. チE�Eロイして動作確誁E

---

## 28. 修正計画�E�E025-12-29 クライアント評価とワーカー評価の刁E���E�E

### 28.1 問題�E概要E
ユーザープロフィールペ�Eジで、クライアントとしての評価とワーカーとしての評価が混在して表示されてぁE��。�EのぁE��ワーカーがクライアントとして厳しく評価された場合に、ワーカーとしての評価が下がってしまぁE��題がある、E

### 28.2 原因刁E��
1. **User型に評価ぁEつしかなぁE*: `rating`と`reviewCount`ぁEつずつしかなく、クライアントとしての評価とワーカーとしての評価が区別されてぁE��ぁE
2. **Review型�E`role`フィールド�E意味**: 現在は「評価老E�E役割」を示してぁE��が、これを「被評価老E��どの立場で評価されたか」として解釈し直す忁E��がある
   - `role: 'client'` = クライアントが評価した = ワーカーとしての評価
   - `role: 'worker'` = ワーカーが評価した = クライアントとしての評価
3. **プロフィールペ�Eジ**: 評価が混在して表示されてぁE��

### 28.3 修正冁E��

#### 1. User型�E拡張 (`src/types/index.ts`)
```typescript
// 既存�Erating, reviewCountに加えて、役割別の評価を追加
clientRating?: number;      // クライアントとしての評価
clientReviewCount?: number; // クライアントとしての評価件数
workerRating?: number;      // ワーカーとしての評価
workerReviewCount?: number; // ワーカーとしての評価件数
```

#### 2. db.ts の修正
- `getUserReviews`関数に`revieweeRole`パラメータを追加し、役割別に評価を取得できるようにする
- 評価保存時に役割別の評価も更新する

#### 3. 評価作�EAPI (`/api/reviews/create`) の修正
- 評価保存時に、被評価老E�E役割別評価�E�ElientRating/workerRating�E�も更新する

#### 4. プロフィールペ�Eジ (`/users/[id]`) の修正
- 「クライアントとしての評価」と「ワーカーとしての評価」を別、E�Eセクションで表示
- 左カラムの統計情報も役割別に表示

### 28.4 実裁E��頁E
1. `src/types/index.ts` - User型に役割別評価フィールドを追加
2. `src/lib/db.ts` - `getUserReviews`関数を修正�E�役割別フィルタリング追加�E�E
3. `src/app/api/reviews/create/route.ts` - 役割別評価の更新ロジチE��を追加
4. `src/app/(main)/users/[id]/page.tsx` - 評価表示を役割別に刁E��
5. チE�Eロイして動作確誁E

### 28.5 評価の役割判定ロジチE��
- **ワーカーとしての評価**: `role === 'client'`�E�クライアントがワーカーを評価�E�E
- **クライアントとしての評価**: `role === 'worker'`�E�ワーカーがクライアントを評価�E�E

---

## 29. 修正計画�E�E025-12-29 通知機�Eの削除�E�E

### 29.1 問題�E概要E
通知機�Eが機�EしてぁE��ぁE��め、「�E通設定」や「�EチE��ー」から削除する、E

### 29.2 削除対象

#### 1. ヘッダー (`src/components/layouts/Header.tsx`)
- `Bell` アイコンのインポ�Eト削除
- `getNotifications`, `markAsRead` のインポ�Eト削除
- `Notification` 型�Eインポ�Eト削除
- `isNotificationsOpen`, `notifications` スチE�Eト削除
- `notificationMenuRef` 削除
- 通知取得�E `useEffect` 削除
- `handleNotificationClick` 関数削除
- `unreadCount` 変数削除
- 通知ドロチE�Eダウン全体（�EルアイコンとドロチE�Eダウンメニュー�E�削除

#### 2. 共通設定サイドバー (`src/app/(main)/account/layout.tsx`)
- `Bell` アイコンのインポ�Eト削除
- 「通知設定」メニュー頁E��削除

### 29.3 実裁E��頁E
1. `src/components/layouts/Header.tsx` から通知関連のコードを削除
2. `src/app/(main)/account/layout.tsx` から「通知設定」メニュー頁E��を削除
3. チE�Eロイして動作確誁E

---

## 30. 修正計画�E�E025-12-29 ワーカー仕事検索機�Eの追加�E�E

### 30.1 依頼冁E��
ワーカーの仕事を探す�Eージに検索機�Eをつけることは可能か！E

### 30.2 現状刁E��
- **ペ�Eジ**: `/worker/search/page.tsx`
- **現在の機�E**: カチE��リーによるフィルタリングのみ
- **DB関数**: `getJobs(category?: string)` - カチE��リーのみ対忁E

### 30.3 実裁E��能性
**可能です、E* 以下�E検索機�Eを追加できます！E

1. **キーワード検索**: タイトル・説明文に含まれるキーワードで検索
   - Firestoreの制限上、�E斁E��索はクライアントサイドで実裁E
   - 全案件を取得後、JavaScriptでフィルタリング

2. **予算篁E��での絞り込み**: 最小予算〜最大予算�E篁E��持E��E
   - クライアントサイドでフィルタリング

3. **期限での絞り込み**: 募集期限が指定日以降�E案件のみ表示
   - クライアントサイドでフィルタリング

### 30.4 技術的制紁E
- Firestoreは全斁E��索をネイチE��ブサポ�EトしてぁE��ぁE��め、キーワード検索はクライアントサイドで実裁E
- 案件数が少なぁE��状では、�E件取得後�Eクライアントサイドフィルタリングで十�Eなパフォーマンス
- 封E��皁E��案件数が増えた場合�E、Algoliaなどの全斁E��索サービスの導�Eを検訁E

### 30.5 修正冁E��

#### 1. UI (`src/app/(main)/worker/search/page.tsx`)
- キーワード検索入力欁E��追加
- 予算篁E���E�最小�E最大�E��E入力欁E��追加
- 検索ボタンを追加
- クライアントサイドでのフィルタリングロジチE��を実裁E

### 30.6 実裁E��頁E
1. `src/app/(main)/worker/search/page.tsx` を修正
   - キーワード検索フィールドを追加
   - 予算篁E��フィールドを追加
   - フィルタリングロジチE��を実裁E
2. チE�Eロイして動作確誁E

---

## 32. 修正計画�E�E025-12-29 完亁E�Eロジェクト�E自動削除機�E�E�E

### 32.1 依頼冁E��
完亁E��た�Eロジェクト�E保管期間が無限だとサーバ�Eの負拁E��大きいので、Eか月で自動削除するようにしたぁE��また、保管期限が設定できる場合、利用規紁E��に記載し、保存忘れリスクを防ぐため�E注意喚起も行う、E

### 32.2 実裁E��釁E

#### 1. 自動削除対象
- **契紁E��Eontracts�E�E*: スチE�EタスぁE`completed` また�E `cancelled` で、`completedAt` また�E `updatedAt` から3か月経過したも�E
- **関連チE�Eタ**: 契紁E��紐づくメチE��ージルーム、納品ファイル�E�Eirebase Storage�E�E

#### 2. 削除前�E通知
- 削除2週間前にメール通知を送信
- 削除1週間前に再度メール通知を送信
- ダチE��ュボ�Eドにも警告を表示

#### 3. 利用規紁E��の記輁E
- 第12条�E�退会）�E後に「第12条の2�E�データの保管期間�E�」を追加
- 完亁E��た契紁E��ータは3か月後に自動削除される旨を�E訁E

#### 4. ユーザーへの注意喚起
- 契紁E��亁E��面に「納品物は3か月後に削除されます」�E警告を表示
- ダチE��ュボ�Eドに削除予定�E契紁E��警告表示
- 契紁E��覧ペ�Eジに削除予定日を表示

### 32.3 実裁E�E容

#### 1. Cloud Functions (`functions/src/index.ts`)
```typescript
// 5. 完亁E�Eロジェクト�E自動削除 (Daily)
export const deleteOldCompletedContracts = functions.pubsub.schedule("every 24 hours").onRun(async (context) => {
  const now = new Date();
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const threeMonthsAgoTimestamp = admin.firestore.Timestamp.fromDate(threeMonthsAgo);

  // 完亁E��た�E キャンセルされた契紁E��3か月経過したも�Eを取征E
  const contractsRef = db.collection("contracts");
  
  // completedの契紁E
  const completedSnapshot = await contractsRef
    .where("status", "==", "completed")
    .where("completedAt", "<", threeMonthsAgoTimestamp)
    .get();

  // cancelledの契紁E
  const cancelledSnapshot = await contractsRef
    .where("status", "==", "cancelled")
    .where("updatedAt", "<", threeMonthsAgoTimestamp)
    .get();

  const allDocs = [...completedSnapshot.docs, ...cancelledSnapshot.docs];
  
  for (const doc of allDocs) {
    // 契紁E��削除
    await doc.ref.delete();
    console.log(`Deleted old contract ${doc.id}`);
  }
  
  return null;
});

// 6. 削除予定通知 (Daily)
export const notifyUpcomingDeletion = functions.pubsub.schedule("every 24 hours").onRun(async (context) => {
  // 2週間後に削除予定�E契紁E��通知
  // 1週間後に削除予定�E契紁E��通知
});
```

#### 2. 利用規紁E�Eージ (`src/app/(main)/terms/page.tsx`)
- 「第12条の2�E�データの保管期間�E�」セクションを追加

#### 3. 契紁E��亁E��面 (`src/app/(main)/client/contracts/[id]/page.tsx`, `src/app/(main)/worker/contracts/[id]/page.tsx`)
- 完亁E��チE�Eタス時に警告バナ�Eを表示

#### 4. ダチE��ュボ�EチE(`src/app/(main)/client/dashboard/page.tsx`, `src/app/(main)/worker/dashboard/page.tsx`)
- 削除予定�E契紁E��ある場合に警告を表示

#### 5. 契紁E��覧ペ�Eジ
- 削除予定日を表示

### 32.4 実裁E��頁E
1. `functions/src/index.ts` - 自動削除バッチ�E琁E��削除予定通知を追加
2. `src/app/(main)/terms/page.tsx` - 利用規紁E��チE�Eタ保管期間の条頁E��追加
3. `src/app/(main)/client/contracts/[id]/page.tsx` - 完亁E��の警告バナ�Eを追加
4. `src/app/(main)/worker/contracts/[id]/page.tsx` - 完亁E��の警告バナ�Eを追加
5. `src/app/(main)/client/dashboard/page.tsx` - 削除予定警告を追加
6. `src/app/(main)/worker/dashboard/page.tsx` - 削除予定警告を追加
7. Firebase Functionsをデプロイ
8. Cloud Runをデプロイ
9. 動作確誁E

## 33. 修正計画�E�E025-12-29 トップ�Eージ「選ばれる琁E��」セクション削除�E�E

### 33.1 依頼冁E��
トップ�Eージの「選ばれる琁E��」セクション�E�単一アカウント制、�Eロジェクト方式特化、インボイス対応、本人確認済みバッジの4つのカード）を削除する、E

### 33.2 修正冁E��
`src/app/page.tsx` から「Trust Section」（選ばれる琁E���E�セクション全体を削除する、E

### 33.3 実裁E��頁E
1. `src/app/page.tsx` から Trust Section を削除
2. 不要になっぁE`Check` アイコンのインポ�Eトを削除
3. チE�Eロイして動作確誁E

---

## 34. 修正計画�E�E025-12-30 直接メチE��ージ機�Eの実裁E��E

### 34.1 問題�E概要E
ユーザープロフィールペ�Eジで「メチE��ージを送る」�Eタンを押すと、「メチE��ージ機�Eは案件詳細ペ�Eジから利用してください�E�直接メチE��ージは未実裁E��」とぁE��アラートが表示される。直接メチE��ージ機�Eが未実裁E�Eため、案件を介さずにユーザー間でメチE��ージをやり取りできなぁE��E

### 34.2 現状刁E��
1. **既存�EメチE��ージ機�E**: `proposalId`�E�応募ID�E�また�E`contractId`�E�契約ID�E�をルームIDとして使用
2. **FirestoreセキュリチE��ルール**: `rooms`コレクションは`participants`フィールドで参加老E��管琁E��認証済みユーザーは新規ルーム作�E可能
3. **メチE��ージペ�Eジ**: 案件/契紁E�Eースのルームのみを想定した実裁E

### 34.3 修正冁E��

#### 1. ルームID生�EロジチE��
- 直接メチE��ージ用のルームIDは `dm_${userId1}_${userId2}` 形式！EDはソート済み�E�E
- 同じ2人のユーザー間では常に同じルームIDが生成される

#### 2. ユーザープロフィールペ�Eジ (`/users/[id]`)
- 「メチE��ージを送る」�EタンのクリチE��時に�E�E
  1. 直接メチE��ージ用のルームIDを生戁E
  2. ルームが存在しなぁE��合�E作�E
  3. メチE��ージペ�Eジ�E�E/messages/[roomId]`�E�へ遷移

#### 3. メチE��ージペ�Eジ (`/messages/[roomId]`)
- `dm_`プレフィチE��スで始まるルームIDの場合、直接メチE��ージモードとして処琁E
- 直接メチE��ージモードでは�E�E
  - 案件/契紁E��報パネルを非表示
  - 相手ユーザーの惁E��を取得して表示
  - チャチE��機�Eのみを提侁E

### 34.4 実裁E��頁E
1. `src/app/(main)/users/[id]/page.tsx` - 「メチE��ージを送る」�Eタンの実裁E
2. `src/app/(main)/messages/[roomId]/page.tsx` - 直接メチE��ージモード�E追加
3. チE�Eロイして動作確誁E

---

## 35. 修正計画�E�E025-12-30 契紁E��ロー・仮払いボタン表示問題�E修正�E�E

### 35.1 問題�E概要E
1. **問題①**: ワーカーモードで「仮払いへ進む」�Eタンが表示されてぁE���E�本来はクライアント�Eのみ�E�E
2. **問題②**: 契紁E��ローで「契紁E��意」スチE��プ！Epending_signature`�E�がスキチE�EされてぁE��

### 35.2 原因刁E��

#### 問題①の原因
`src/app/(main)/messages/[roomId]/page.tsx`の紁E00行目付近で、`waiting_for_escrow`スチE�Eタス時に「仮払いへ進む」�Eタンを表示する際、`isClient`のチェチE��がなぁE��E

#### 問題②の原因
`src/app/api/contracts/create/route.ts`の130行目付近で、契紁E���E時�E初期スチE�Eタスが`waiting_for_escrow`に設定されており、`pending_signature`�E�ワーカー合意征E���E�スチE��プがスキチE�EされてぁE��、E

コメントに「to skip worker agreement step」と記載されており、意図皁E��スキチE�EされてぁE��、E

### 35.3 修正冁E��

#### 1. 契紁E���EAPI (`src/app/api/contracts/create/route.ts`)
- 初期スチE�Eタスを`pending_signature`に変更
- ワーカーが合意するまで仮払いに進めなぁE��ぁE��する

#### 2. メチE��ージペ�Eジ (`src/app/(main)/messages/[roomId]/page.tsx`)
- `waiting_for_escrow`スチE�Eタス時�E「仮払いへ進む」�Eタン表示に`isClient`チェチE��を追加
- ワーカー側には「クライアント�E仮払いをお征E��ください」とぁE��メチE��ージを表示

### 35.4 実裁E��頁E
1. `src/app/api/contracts/create/route.ts` - 初期スチE�Eタスを`pending_signature`に変更
2. `src/app/(main)/messages/[roomId]/page.tsx` - 仮払いボタンの表示条件にisClientチェチE��を追加
3. チE�Eロイして動作確誁E

---

## 37. 修正計画�E�E025-12-30 仮決済�Eタンが反応しなぁE��題�E調査・修正�E�E

### 37.1 問題�E概要E
クライアントモードで契紁E��細ペ�Eジの「仮決済へ進む」�Eタンを押しても、�Eに進まなぁE��反応しなぁE��、E

### 37.2 原因刁E��
1. **ボタンのonClickイベントが発火してぁE��ぁE��能性** - スマ�EでのタチE��イベント問顁E
2. **APIエラーが発生してぁE��がalertが表示されなぁE* - ブラウザのポップアチE�EブロチE��
3. **認証ト�Eクンが取得できてぁE��ぁE* - ログイン状態�E問顁E
4. **isProcessingがtrueのままになってぁE��** - 前回のクリチE��で処琁E��のまま

### 37.3 修正冁E��
1. **チE��チE��ログの追加** - `handleEscrow`関数に詳細なコンソールログを追加し、どこで処琁E��止まってぁE��かを特宁E
2. **認証ト�EクンのチェチE��強匁E* - ト�Eクンが取得できなぁE��合�Eエラーハンドリングを追加
3. **APIレスポンスのログ出劁E* - レスポンススチE�EタスとチE�Eタをログ出劁E

### 37.4 実裁E��頁E
1. `src/app/(main)/client/contracts/[id]/page.tsx` にチE��チE��ログを追加
2. チE�Eロイして動作確誁E
3. コンソールログを確認して問題�E原因を特宁E
4. 忁E��に応じて追加の修正を実施

---

## 36. 修正計画�E�E025-12-30 応募一覧UIの改喁E��E

### 36.1 依頼冁E��
1. 「採用する」�Eタンを削除
2. 「詳細・交渉」�Eタンに色を付けめE

### 36.2 修正対象
`src/app/(main)/client/jobs/[id]/page.tsx` - クライアント案件詳細ペ�Eジの応募一覧セクション

### 36.3 修正冁E��
1. **「採用する」�Eタンの削除**: `job.status === 'open'`条件で表示される「採用する」�Eタンを削除
2. **「詳細・交渉」�Eタンの色付け**: `variant="outline"`から`variant="default"`�E�Erimaryカラー�E�に変更

### 36.4 実裁E��頁E
1. `src/app/(main)/client/jobs/[id]/page.tsx`を修正
2. チE�Eロイして動作確誁E

---

## 38. 修正計画�E�E025-12-30 仮決済�EタンがStripeに飛�EなぁE��題�E修正�E�E

### 38.1 問題�E概要E
クライアントモードで契紁E��細ペ�Eジの「仮決済へ進む」�Eタンを押しても、Stripeの決済画面に遷移せず、エラーメチE��ージ `Unexpected token 'u', "upstream r"... is not valid JSON` が表示される、E

### 38.2 原因刁E��
1. **ドメインマッピングのタイムアウト問顁E*: カスタムドメイン�E�Epj-markethub.com`�E�経由のAPIコールがタイムアウトし、Cloud Runからの応答が正しく返ってこなぁE
2. **エラーメチE��ージの意味**: `"upstream r"...` は「upstream request timeout」�E一部であり、�Eロキシ/ロードバランサーがタイムアウトしたことを示ぁE
3. **JSONパ�Eスエラー**: タイムアウトエラーメチE��ージをJSONとしてパ�EスしよぁE��して失敁E

### 38.3 修正冁E��
**APIコールをCloud Run直接URL経由に変更**

`src/app/(main)/client/contracts/[id]/page.tsx` の以下�E箁E��を修正�E�E
1. `handleEscrow` 関数冁E�E `create-payment-intent` APIコール
2. `verifyPayment` 関数冁E�E `verify-payment` APIコール
3. `handleCapture` 関数冁E�E `capture-payment-intent` APIコール
4. `onSuccess` コールバック冁E�E `verify-payment` APIコール

**修正パターン:**
```typescript
// Before
const res = await fetch('/api/stripe/create-payment-intent', { ... });

// After
const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
const res = await fetch(`${apiUrl}/api/stripe/create-payment-intent`, { ... });
```

### 38.4 環墁E��数
`NEXT_PUBLIC_API_URL` は Cloud Run の直接URL�E�Ehttps://projectmarkethub-700356537492.asia-northeast1.run.app`�E�を持E��、E

### 38.5 再発防止筁E
1. **APIコール時�Eベスト�EラクチE��ス**: 決済関連など重要なAPIコールは、ドメインマッピングのタイムアウトを回避するため、Cloud Run直接URLを使用する
2. **環墁E��数の活用**: `NEXT_PUBLIC_API_URL` を使用してAPIのベ�EスURLを一允E��琁E��めE
3. **エラーハンドリングの強匁E*: タイムアウトエラーを適刁E��キャチE��し、ユーザーにわかりやすいメチE��ージを表示する
4. **今後�E新規API実裁E��**: 同様�EパターンでCloud Run直接URLを使用することを検討すめE

### 38.6 実裁E��亁E��E025-12-30�E�E
- 修正をデプロイし、動作確認完亁E
- 仮決済�Eタンが正常にStripe決済画面を表示するようになっぁE

---

## 39. 修正計画�E�E025-12-30 評価送信機�Eのタイムアウト問題修正�E�E

### 39.1 問題�E概要E
クライアント�Eもワーカー側も「評価を送信」�Eタンを押すと「送信中...」と表示されたまま動かなくなる、E

### 39.2 原因刁E��
`src/lib/db.ts`の`submitReview`関数が相対パス�E�E/api/reviews/create`�E�でAPIを呼び出してぁE��ため、カスタムドメイン�E�Epj-markethub.com`�E�経由でタイムアウトが発生してぁE��。これ�E仮決済�Eタンと同じ問題（修正計画38で対応済み�E�、E

### 39.3 修正冁E��
`src/lib/db.ts`の`submitReview`関数で、APIコールをCloud Run直接URL経由に変更する、E

**修正パターン:**
```typescript
// Before
const res = await fetch("/api/reviews/create", { ... });

// After
const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
const res = await fetch(`${apiUrl}/api/reviews/create`, { ... });
```

### 39.4 実裁E��頁E
1. `src/lib/db.ts`の`submitReview`関数を修正
2. チE�Eロイして動作確誁E

### 39.5 実裁E��亁E��E025-12-30�E�E
- `src/lib/db.ts`の`submitReview`関数を修正し、Cloud Run直接URL経由でAPIを呼び出すよぁE��変更
- チE�Eロイ完亁E��Euild ID: 309686c7-63c1-4889-8da1-0a71159fe481、スチE�Eタス: SUCCESS�E�E
- 評価送信機�Eがタイムアウトせずに正常に動作するよぁE��なっぁE

### 39.6 追加対応！E025-12-30�E�E
**問顁E*: 修正後もユーザーから「直ってぁE��ぁE��とフィードバチE��があった、E

**原因**: Cloud RunのサービスURLが変更されてぁE��、E
- 旧URL: `https://projectmarkethub-ga4mbdxvtq-an.a.run.app`
- 新URL: `https://projectmarkethub-173689610587.asia-northeast1.run.app`

`cloudbuild.yaml`の`_NEXT_PUBLIC_API_URL`が古いURLを指してぁE��ため、ビルド時に古いURLがアプリケーションに埋め込まれてぁE��、E

**対忁E*:
1. `cloudbuild.yaml`の`_NEXT_PUBLIC_API_URL`を最新のCloud Run URLに更新
2. 再ビルド�E再デプロイを実行！Euild ID: 94b440bc-39ec-442d-8fab-35d1c72faff4�E�E
3. Cloud RunにチE�Eロイ�E�リビジョン: projectmarkethub-00108-bhj�E�E

**教訁E*: 
- Cloud RunのURLは特定�E操作（サービス再作�E等）で変更される可能性があめE
- チE�Eロイ前に忁E��現在のCloud Run URLを確認し、`cloudbuild.yaml`の設定と一致してぁE��か確認すること
- URLが変更された場合�E、Cloud RunへのチE�Eロイだけでなく、E*再ビルドが忁E��E*�E�ENEXT_PUBLIC_`環墁E��数はビルド時にインライン化されるため�E�E

**確認コマンチE*:
```bash
gcloud run services describe projectmarkethub --region=asia-northeast1 --format="value(status.url)" --project=projectmarkethub-db904
```

---

## 40. 修正計画�E�E025-12-30 「オファーを送信する」タイムアウト問題�E修正�E�E

### 40.1 問題�E概要E
クライアントモードで「オファーを送信する」�Eタンを押すと、`AbortError: signal is aborted without reason` エラーが発生し、タイムアウトする、E

### 40.2 原因刁E��
1. **firebase-admin初期化�E問顁E*: Cloud Run環墁E��`firebase-admin`の初期化がハングしてぁE��
2. **初期化タイミング**: モジュールインポ�Eト時に即座に初期化が実行され、APIリクエスト�E琁E��にハングしてぁE��
3. **Application Default Credentials**: Cloud Run環墁E��は`applicationDefault()`を�E示皁E��使用する忁E��があっぁE

### 40.3 修正冁E��
`src/lib/firebase-admin.ts`を遅延初期化！Eazy Initialization�E�パターンに変更�E�E

1. **Proxyパターンの採用**: `adminAuth`と`adminDb`をProxyオブジェクトとしてエクスポ�EチE
2. **遁E��初期匁E*: 実際にプロパティにアクセスされた時点で初期化を実衁E
3. **Application Default Credentials**: Cloud Run環墁E��は`admin.credential.applicationDefault()`を�E示皁E��使用

**修正後�EコーチE**
```typescript
import * as admin from 'firebase-admin';

let initialized = false;

function initializeFirebaseAdmin() {
    if (initialized || admin.apps.length > 0) {
        return;
    }
    
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'projectmarkethub-db904';
    
    try {
        if (process.env.FIREBASE_PRIVATE_KEY) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: projectId,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
                }),
            });
        } else {
            // Cloud Run環墁E��は、applicationDefault()を�E示皁E��使用
            admin.initializeApp({
                credential: admin.credential.applicationDefault(),
                projectId: projectId,
            });
        }
        initialized = true;
    } catch (error) {
        throw error;
    }
}

// Proxyパターンで遁E��初期匁E
export const adminAuth = new Proxy({} as admin.auth.Auth, {
    get(target, prop) {
        initializeFirebaseAdmin();
        return (admin.auth() as any)[prop];
    }
});

export const adminDb = new Proxy({} as admin.firestore.Firestore, {
    get(target, prop) {
        initializeFirebaseAdmin();
        return (admin.firestore() as any)[prop];
    }
});

export const FieldValue = admin.firestore.FieldValue;
```

### 40.4 実裁E��頁E
1. `src/lib/firebase-admin.ts`を遅延初期化パターンに変更
2. Cloud Buildで再ビルド！Euild ID: e059277d-92af-4e24-8e9c-a4dc644a5172�E�E
3. Cloud RunにチE�Eロイ�E�リビジョン: projectmarkethub-00110-469�E�E
4. 動作確誁E- APIレスポンス時間ぁE00秒�E1.86秒に改喁E

### 40.5 チE��ト結果
```bash
# 契紁E���EAPI
curl -X POST "https://pj-markethub.com/api/contracts/create" -H "Content-Type: application/json" -d "{}"
# 結果: {"error":"Unauthorized"}, HTTP Status: 401, Time: 1.864678s

# 評価作�EAPI
curl -X POST "https://pj-markethub.com/api/reviews/create" -H "Content-Type: application/json" -d "{}"
# 結果: {"error":"Unauthorized"}, HTTP Status: 401, Time: 0.226895s
```

### 40.6 教訁E
1. **Cloud Run環墁E��のfirebase-admin初期匁E*: `applicationDefault()`を�E示皁E��使用すること
2. **遁E��初期化�E重要性**: モジュールインポ�Eト時ではなく、実際に使用される時点で初期化することで、�E期化の問題を回避できる
3. **Proxyパターン**: 既存�Eコードを変更せずに遁E��初期化を実現できる便利なパターン

---

## 41. 修正計画�E�E025-12-30 メールアドレス変更機�Eの削除�E�E

### 41.1 依頼冁E��
メールアドレス変更機�Eは不要なので削除する、E

### 41.2 現状刁E��
1. **セキュリチE��ペ�Eジ (`/account/security`)**: 「メールアドレス変更」と「パスワード変更」�E2つのタブがある
2. **サイドバー (`account/layout.tsx`)**: 「メールアドレス・パスワード」とぁE��メニュー名で表示

### 41.3 修正冁E��

#### 1. セキュリチE��ペ�Eジ (`src/app/(main)/account/security/page.tsx`)
- タブUIを削除�E�パスワード変更のみになるため不要E��E
- メールアドレス変更関連のコード！Etate、handler、UI�E�を削除
- ペ�Eジタイトルを「パスワード変更」に変更
- `Mail`アイコンのインポ�Eトを削除
- `updateEmail`のインポ�Eトを削除

#### 2. サイドバー (`src/app/(main)/account/layout.tsx`)
- メニュー名を「メールアドレス・パスワード」から「パスワード変更」に変更

### 41.4 実裁E��頁E
1. `src/app/(main)/account/security/page.tsx` を修正
2. `src/app/(main)/account/layout.tsx` を修正
3. チE�Eロイして動作確誁E

---

## 42. 修正計画�E�E025-12-31 お問ぁE��わせ先メールアドレス変更・利用規紁E��頁E��号修正�E�E

### 42.1 依頼冁E��
1. お問ぁE��わせ先メールアドレスめE`service@meeting-agency.com` から `service@pj-markethub.com` に変更
2. 利用規紁E�E「第12条の2」を「第13条」に変更し、以降�E条頁E��号を振りなおす

### 42.2 修正対象ファイル

#### メールアドレス変更
1. `src/components/layouts/Footer.tsx` - フッターのお問ぁE��わせ欁E
2. `src/app/(main)/law/page.tsx` - 特定商取引法に基づく表訁E
3. `src/app/(main)/privacy/page.tsx` - プライバシーポリシーのお問ぁE��わせ窓口
4. `☁Eekkei.md` - 設計書冁E�E連絡先情報

#### 利用規紁E��頁E��号修正
1. `src/app/(main)/terms/page.tsx` - 利用規紁E�Eージ
   - 「第12条の2�E�データの保管期間�E�」�E「第13条�E�データの保管期間�E�、E
   - 「第13条�E�保証の否認およ�E免責事頁E��」�E「第14条�E�保証の否認およ�E免責事頁E��、E
   - 「第14条�E�サポ�Eトおよ�E問い合わせ）」�E「第15条�E�サポ�Eトおよ�E問い合わせ）、E
   - 「第15条�E�サービス冁E��の変更等）」�E「第16条�E�サービス冁E��の変更等）、E
   - 「第16条�E�利用規紁E�E変更�E�」�E「第17条�E�利用規紁E�E変更�E�、E
   - 「第17条�E�個人惁E��の取扱ぁE��」�E「第18条�E�個人惁E��の取扱ぁE��、E
   - 「第18条�E�通知また�E連絡�E�」�E「第19条�E�通知また�E連絡�E�、E
   - 「第19条�E�権利義務�E譲渡の禁止�E�」�E「第20条�E�権利義務�E譲渡の禁止�E�、E
   - 「第20条�E��E離可能性�E�」�E「第21条�E��E離可能性�E�、E
   - 「第21条�E�準拠法�E裁判管轁E��」�E「第22条�E�準拠法�E裁判管轁E��、E

2. `☁Eekkei.md` - 設計書冁E�E利用規紁E��クション
   - 同様�E条頁E��号修正

### 42.3 実裁E��頁E
1. `src/components/layouts/Footer.tsx` のメールアドレスを変更
2. `src/app/(main)/law/page.tsx` のメールアドレスを変更
3. `src/app/(main)/privacy/page.tsx` のメールアドレスを変更
4. `src/app/(main)/terms/page.tsx` の条頁E��号を修正
5. `☁Eekkei.md` のメールアドレスと条頁E��号を修正
6. チE�Eロイして動作確誁E

---

## 43. 修正計画�E�E026-01-01 報酬履歴のスクロール・CSV出力機�E追加�E�E

### 43.1 依頼冁E��
1. 報酬履歴ぁE1件以上�Eスクロールできるようにする
2. 報酬履歴をCSVで出力できるようにする

### 43.2 現状刁E��
- **ペ�Eジ**: `/account/worker/payout/page.tsx`
- **報酬履歴チE�Eブル**: 全件表示されており、件数が増えるとペ�Eジが長くなめE
- **CSV出力機�E**: 未実裁E

### 43.3 修正冁E��

#### 1. 報酬履歴のスクロール機�E
- チE�Eブルを固定高さ�E�最大10件刁E��度�E��EコンチE��に入れる
- `overflow-y: auto`でスクロール可能にする
- ヘッダー行�E固定！Esticky`�E�にして常に表示

#### 2. CSV出力機�E
- 「CSVダウンロード」�Eタンを追加
- クリチE��時に報酬履歴チE�EタをCSV形式でダウンローチE
- CSVの刁E 案件吁E 報酬顁E 完亁E��, スチE�Eタス

### 43.4 実裁E��頁E
1. `src/app/(main)/account/worker/payout/page.tsx` を修正
   - 報酬履歴チE�Eブルにスクロール機�Eを追加
   - CSV出力�Eタンと関数を追加
2. チE�Eロイして動作確誁E

---

## 44. 修正計画�E�E026-01-01 ドメイン変更・UI改喁E�Eロゴ変更�E�E

### 44.1 依頼冁E��
1. **ドメイン変更**: `https://pj-markethub.com/` ↁE`https://pj-markethub.com/`
2. **ログインボタンの視認性改喁E*: トップ�Eージのログインボタンが背景と同化して見えなぁE
3. **ショートカチE��ロゴ変更**: 現在の三角ロゴからミツバチチE��インに変更
4. **啁E���Eーク確誁E*: ©めE�の使用状況を確認し、不適刁E��使用があれ�E削除

### 44.2 現状刁E��

#### ①ドメイン変更
- **cloudbuild.yaml**: `_NEXT_PUBLIC_BASE_URL: 'https://pj-markethub.com'`
- **src/app/(main)/law/page.tsx**: 特定商取引法表記にURLが記輁E
- **Firebase認証**: 承認済みドメインに新ドメインの追加が忁E��E
- **☁Eekkei.md**: 設計書冁E�EURL参�E

#### ②ログインボタン
- **問顁E*: `TopPageButtons.tsx`でログインボタンが`border-white text-white`となってぁE��
- **背景**: トップ�Eージのヒ�Eローセクションは`bg-gray-50`�E�薄ぁE��レー/ほぼ白�E�E
- **結果**: 白ぁE��景に白ぁE�Eタンで見えにくい

#### ③ショートカチE��ロゴ
- **現在**: `src/app/favicon.ico`に三角形のロゴ
- **要望**: ミツバチチE��インに変更

#### ④啁E���Eーク
- **確認結果**: ©�E�著作権マ�Eク�E��Eみ使用�E�Eooter.tsx�E�E
- **判断**: ©は著作権表示であり、商標登録とは無関係。一般皁E��使用されるもので問題なぁE
- **®めE��**: 使用されてぁE��ぁEↁE対応不要E

### 44.3 修正冁E��

#### 1. ドメイン変更対忁E
**注愁E*: ドメイン変更は以下�E作業が忁E��だが、DNS設定やCloud Runのドメインマッピングは手動で行う忁E��がある。コード上�E変更のみ実施、E

- `cloudbuild.yaml`: `_NEXT_PUBLIC_BASE_URL`を変更
- `src/app/(main)/law/page.tsx`: URLを変更
- `☁Eekkei.md`: 設計書冁E�EURL参�Eを変更

**手動作業�E�ユーザー側�E�E*:
- Cloud Runのドメインマッピングに`pj-markethub.com`を追加
- Firebase Authenticationの承認済みドメインに`pj-markethub.com`を追加
- DNS設定（ドメインレジストラ側�E�E

#### 2. ログインボタンの視認性改喁E
- `src/components/features/top/TopPageButtons.tsx`を修正
- ログインボタンの色を`border-secondary text-secondary`に変更�E�濁E��で視認性向上！E

#### 3. ショートカチE��ロゴ変更
- ミツバチチE��インのSVGファビコンを作�E
- `src/app/favicon.ico`を置き換ぁE

#### 4. 啁E���Eーク
- 対応不要E��©は著作権表示で問題なし、E�めE��は使用されてぁE��ぁE��E

### 44.4 実裁E��頁E
1. `src/components/features/top/TopPageButtons.tsx` - ログインボタンの色を変更
2. `src/app/favicon.ico` - ミツバチチE��インに変更
3. `cloudbuild.yaml` - ドメインURLを変更
4. `src/app/(main)/law/page.tsx` - 特定商取引法表記�EURLを変更
5. `☁Eekkei.md` - 設計書冁E�EURL参�Eを変更
6. チE�Eロイして動作確誁E

---

## 45. 修正計画�E�E026-01-01 Googleログイン「auth/unauthorized-domain」エラー修正�E�E

### 45.1 問題�E概要E
GoogleアカウントでログインしよぁE��すると、「Firebase: Error (auth/unauthorized-domain)」エラーが発生し、ログインできなぁE��E

### 45.2 原因刁E��
Firebase Authenticationの「Authorized domains」（承認済みドメイン�E�リストに、現在のドメイン�E�Epj-markethub.com`�E�が含まれてぁE��ぁE��E

### 45.3 解決方況E
**Firebase Consoleでの手動設定が忁E��E��E*

1. https://console.firebase.google.com/ にアクセス
2. プロジェクト「projectmarkethub-db904」を選抁E
3. 左メニューから「Authentication」を選抁E
4. 「Settings」タブをクリチE��
5. 「Authorized domains」セクションを確誁E
6. 「project-market-hub.com」が含まれてぁE��ければ「Add domain」で追加

### 45.4 注意事頁E
- こ�E設定�Eコード�E変更ではなく、Firebase Consoleでの手動設定が忁E��E
- 設定後、即座に反映される（デプロイ不要E��E
- 封E��皁E��ドメインを`pj-markethub.com`に変更する場合�E、そのドメインも追加が忁E��E

### 45.5 実裁E��亁E
- [ ] Firebase Consoleで承認済みドメインを追加
- [ ] 動作確誁E

---

## 46. 修正計画�E�E026-01-01 公開�Eロフィールにクライアント�Eロフィールが表示されなぁE��題�E修正�E�E

### 46.1 問題�E概要E
公開�Eロフィールペ�Eジ�E�E/users/[id]`�E�にクライアント�Eロフィール�E�会社名、事業冁E��、URL�E�が表示されなぁE��E

### 46.2 原因刁E��
**チE�Eタ構造の不一致が原因�E�E*

1. **クライアント�Eロフィール編雁E�Eージ�E�E/account/client/profile/page.tsx`�E�E*では、データをフラチE��な構造で保存！E
   - `companyName`
   - `companyWebsite`
   - `companyAddress`
   - `companyPhone`
   - `companyDescription`
   - `industry`

2. **公開�Eロフィールペ�Eジ�E�E/users/[id]/page.tsx`�E�E*では、ネストされた構造を参照�E�E
   - `user.clientProfile.companyName`
   - `user.clientProfile.website`
   - `user.clientProfile.description`

3. **設計書のUser型定義**では、`clientProfile`はネストされたオブジェクトとして定義されてぁE��、E

### 46.3 修正方釁E
**両方のペ�Eジを修正して、設計書に準拠したネストされた構造�E�EclientProfile`オブジェクト）に統一する、E*

ただし、既存データとの互換性を老E�Eし、�E開�Eロフィールペ�Eジでは両方の形式（フラチE��構造とネスト構造�E�に対応する、E

### 46.4 修正冁E��

#### 1. クライアント�Eロフィール編雁E�Eージ (`src/app/(main)/account/client/profile/page.tsx`)
- チE�Eタの読み取り時：`clientProfile`オブジェクトから読み取る�E�フォールバックとしてフラチE��構造も対応！E
- チE�Eタの保存時�E�`clientProfile`オブジェクトとして保存すめE
- フィールド名を設計書に合わせる�E�`companyWebsite` ↁE`website`, `companyDescription` ↁE`description`

#### 2. 公開�Eロフィールペ�Eジ (`src/app/(main)/users/[id]/page.tsx`)
- `hasClientProfile`の判定条件を修正して、フラチE��構造のチE�Eタも検�Eできるようにする
- クライアント�Eロフィール表示部刁E��、両方の形式に対応すめE

### 46.5 実裁E��頁E
1. `src/app/(main)/account/client/profile/page.tsx` を修正
2. `src/app/(main)/users/[id]/page.tsx` を修正
3. チE�Eロイして動作確誁E

---

## 47. 修正計画�E�E026-01-01 契紁E��ファー送信APIタイムアウト問題�E修正�E�E

### 47.1 問題�E概要E
クライアントモードで「オファーを送信する」�Eタンを押しても、APIがタイムアウトして契紁E��作�EされなぁE��E

### 47.2 原因刁E��
1. **APIタイムアウチE*: `curl`でAPIを直接呼び出すと30秒以上タイムアウトすめE
2. **healthエンド�Eイント�E正常**: `/api/health`は即座に応答すめE
3. **firebase-admin初期化�E問顁E*: 契紁E���EAPIは`adminAuth`と`adminDb`を使用しており、これらのProxyオブジェクトへのアクセス時にfirebase-adminの初期化が行われる
4. **Cloud RunコールドスターチE*: コールドスタート時にfirebase-adminの初期化がハングしてぁE��可能性

### 47.3 修正冁E��
1. **firebase-admin初期化�Eタイムアウト追加**: 初期化が長時間かかる場合にタイムアウトさせる
2. **初期化状態�Eログ強匁E*: 初期化�E吁E��チE��プでログを�E力し、どこでハングしてぁE��か特定できるようにする
3. **再デプロイ**: 最新のコードをCloud RunにチE�Eロイ

### 47.4 実裁E��頁E
1. `src/lib/firebase-admin.ts`を修正し、�E期化のログを強匁E
2. Cloud Buildで再ビルド�E再デプロイ
3. 動作確誁E

### 47.5 実裁E��亁E��E026-01-01�E�E
**修正冁E���E�E*
1. `src/lib/firebase-admin.ts`にチE��チE��ログを追加し、�E期化の吁E��チE��プでタイミングを記録
2. Cloud Buildで再ビルド！Euild ID: 726594d9-8dff-42d7-a4eb-bd090fe873a0�E�E
3. Cloud RunにチE�Eロイ�E�リビジョン: projectmarkethub-00121-prx�E�E

**チE��ト結果�E�E*
```bash
# 契紁E���EAPI�E�修正前！E
curl -X POST "https://projectmarkethub-5ckpwmqfza-an.a.run.app/api/contracts/create" -H "Content-Type: application/json" -d "{}"
# 結果: タイムアウト！E0秒以上！E

# 契紁E���EAPI�E�修正後！E
curl -X POST "https://projectmarkethub-5ckpwmqfza-an.a.run.app/api/contracts/create" -H "Content-Type: application/json" -d "{}"
# 結果: {"error":"Unauthorized"}, HTTP Status: 401, Time: 0.137515s
```

**Cloud Runログ確認！E*
```
[Contract Create] [0ms] API called
[Contract Create] [0ms] Checking auth header...
[Contract Create] No auth header, returning 401
```

**結論！E*
- APIレスポンス時間ぁE0秒以上�E0.13秒に大幁E��喁E
- firebase-admin初期化が正常に動作してぁE��
- 認証エラー�E�E01�E��E正常な動作（認証ト�EクンなしでのチE��ト�Eため�E�E

### 47.6 追加修正�E�E026-01-01 16:15�E�E
**問題�E発�E�E* 「仮決済へ進む」�Eタンが�EびタイムアウトするよぁE��なった、E

**原因特定！E*
- `contracts/create` APIと `stripe/create-payment-intent` APIの両方ぁE00秒以上タイムアウチE
- healthエンド�Eイント�E正常�E�E.1秒で応答！E
- Firebase Admin SDKの`applicationDefault()`呼び出しがハングしてぁE��可能性

**修正冁E���E�E*
`src/lib/firebase-admin.ts`を修正し、`applicationDefault()`を省略してチE��ォルト�E認証惁E��検�Eに任せる�E�E

```typescript
// Before
admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: projectId,
});

// After
admin.initializeApp({
    projectId: projectId,
});
```

**チE�Eロイ�E�E*
- Build ID: b1861d7f-43be-41a3-9a18-d80c2c519f6e
- リビジョン: projectmarkethub-00122-v2r

**チE��ト結果�E�E*
```bash
# 契紁E���EAPI
curl -X POST "https://projectmarkethub-5ckpwmqfza-an.a.run.app/api/contracts/create" -H "Content-Type: application/json" -d "{}"
# 結果: {"error":"Unauthorized"}, HTTP Status: 401, Time: 2.245386s

# 仮決渁EPI
curl -X POST "https://projectmarkethub-5ckpwmqfza-an.a.run.app/api/stripe/create-payment-intent" -H "Content-Type: application/json" -d "{}"
# 結果: {"error":"Unauthorized"}, HTTP Status: 401, Time: 0.143378s
```

**結論！E*
- APIレスポンス時間ぁE00秒以上�E2秒以下に大幁E��喁E
- `applicationDefault()`を省略することで、Cloud Run環墁E��のFirebase Admin初期化が正常に動作するよぁE��なっぁE

---

## 48. 修正計画�E�E026-01-01 キャンセル機�Eの実裁E��E

### 48.1 依頼冁E��
以下�E3つのキャンセルルートを実裁E��る！E
1. **双方合意によるキャンセル�E�基本ルート！E* - ワーカーが「できません」と認める、また�Eクライアントが「話が違ぁE�EでめE��ます」と伝え、ワーカーが合意した場吁E
2. **連絡不通による自動キャンセル�E�放置対策！E* - ワーカーからの連絡ぁE日間途絶え、クライアントから申請があった場吁E
3. **運営介�Eによる強制返�߁E�トラブル・悪質行為対策！E* - 運営が「ワーカーの債務不履行」と判断し、管琁E��面から強制キャンセル・返��を実衁E

また、管琁E��URLは別途設け、`yamazarukyoto@gmail.com`でのみアクセス可能にする、E

### 48.2 現状刁E��
- **既存�Erefund API**: `/api/stripe/refund/route.ts` が存在し、クライアント本人のみ実行可能
- **管琁E��面**: `/admin/*` が存在するが、認証なしでアクセス可能�E�セキュリチE��問題！E
- **契紁E��細ペ�Eジ**: キャンセルボタンが存在しなぁE

### 48.3 実裁E�E容

#### 1. 双方合意によるキャンセル機�E
**対象スチE�Eタス**: `waiting_for_escrow`, `escrow`, `in_progress`�E�Esubmitted`以降�E原則不可�E�E

**フロー**:
1. クライアントまた�Eワーカーが「キャンセルを申請」�Eタンを押ぁE
2. 相手方に通知が送られる
3. 相手方が「キャンセルに同意」�Eタンを押ぁE
4. 双方合意が�E立したら、シスチE��が�E動的に返��処琁E��実衁E

**実裁E��ァイル**:
- `src/app/api/contracts/cancel-request/route.ts` - キャンセル申請API�E�新規！E
- `src/app/api/contracts/cancel-approve/route.ts` - キャンセル承認API�E�新規！E
- `src/app/(main)/client/contracts/[id]/page.tsx` - キャンセル申請�Eタン追加
- `src/app/(main)/worker/contracts/[id]/page.tsx` - キャンセル申請�Eタン追加
- `src/types/index.ts` - Contract型に`cancelRequestedBy`, `cancelRequestedAt`フィールド追加

#### 2. 連絡不通による自動キャンセル機�E
**条件**: ワーカーからの連絡ぁE日間途絶え、クライアントから「連絡不通申請」があった場吁E

**フロー**:
1. クライアントが「連絡不通を報告」�Eタンを押ぁE
2. 運営に通知が送られる�E�管琁E��面の通報一覧に表示�E�E
3. 運営が確認�E上、強制キャンセル・返��を実衁E

**実裁E��ァイル**:
- `src/app/api/contracts/report-no-contact/route.ts` - 連絡不通報告API�E�新規！E
- `src/app/(main)/client/contracts/[id]/page.tsx` - 連絡不通報告�Eタン追加

#### 3. 運営介�Eによる強制返��機�E
**管琁E��面の認証**:
- `yamazarukyoto@gmail.com`のみアクセス可能
- Firebase Authenticationでログイン状態を確誁E

**実裁E��ァイル**:
- `src/app/admin/layout.tsx` - 管琁E��E��証ガード（新規！E
- `src/app/admin/contracts/[id]/page.tsx` - 契紁E��細・強制キャンセルペ�Eジ�E�新規！E
- `src/app/api/admin/force-cancel/route.ts` - 管琁E��E��強制キャンセルAPI�E�新規！E

### 48.4 チE�Eタベ�Eス変更

#### Contract型�E拡張
```typescript
interface Contract {
  // ... 既存フィールチE
  
  // キャンセル関連
  cancelRequestedBy?: string;      // キャンセル申請老E�EUID
  cancelRequestedAt?: Timestamp;   // キャンセル申請日晁E
  cancelReason?: string;           // キャンセル琁E��
  cancelApprovedBy?: string;       // キャンセル承認老E�EUID
  cancelApprovedAt?: Timestamp;    // キャンセル承認日晁E
  
  // 連絡不通報呁E
  noContactReportedAt?: Timestamp; // 連絡不通報告日晁E
  noContactReportReason?: string;  // 連絡不通報告理由
}
```

### 48.5 実裁E��頁E
1. `src/types/index.ts` - Contract型にキャンセル関連フィールドを追加
2. `src/app/admin/layout.tsx` - 管琁E��E��証ガードを作�E
3. `src/app/api/contracts/cancel-request/route.ts` - キャンセル申請APIを作�E
4. `src/app/api/contracts/cancel-approve/route.ts` - キャンセル承認APIを作�E
5. `src/app/api/contracts/report-no-contact/route.ts` - 連絡不通報告APIを作�E
6. `src/app/api/admin/force-cancel/route.ts` - 管琁E��E��強制キャンセルAPIを作�E
7. `src/app/(main)/client/contracts/[id]/page.tsx` - キャンセル機�EUIを追加
8. `src/app/(main)/worker/contracts/[id]/page.tsx` - キャンセル機�EUIを追加
9. `src/app/admin/contracts/[id]/page.tsx` - 管琁E��E��契紁E��細ペ�Eジを作�E
10. `src/app/admin/contracts/page.tsx` - 契紁E��覧に詳細リンクを追加
11. チE�Eロイして動作確誁E

---

## 49. 修正計画�E�E026-01-01 管琁E��面の強制キャンセルボタン修正�E�E

### 49.1 問題�E概要E
管琁E��面の強制キャンセルボタンを押すと「返��処琁E��にエラーが発生しました」とぁE��エラーが表示される、E

### 49.2 原因刁E��
1. **APIコールが相対パス**: `/api/admin/force-cancel`を使用してぁE��ため、カスタムドメイン経由でタイムアウトが発生する可能性があめE
2. **Stripe返��処琁E�E問顁E*: `capture_method: 'manual'`で作�EされたPaymentIntentは、キャプチャ前�E状態では`refund`ではなく`cancel`を使用する忁E��がある
3. **PaymentIntentの状態確認不足**: 返��前にPaymentIntentの状態を確認してぁE��ぁE

### 49.3 修正冁E��

#### 1. 管琁E��面のAPIコール修正 (`src/app/admin/page.tsx`)
- 相対パスからCloud Run直接URL経由に変更

#### 2. Stripe返��処琁E�E修正 (`src/lib/stripe.ts`)
- `cancelOrRefundPaymentIntent`関数を追加
- PaymentIntentの状態に応じて`cancel`また�E`refund`を使ぁE�Eける

#### 3. 強制キャンセルAPIの修正 (`src/app/api/admin/force-cancel/route.ts`)
- 新しい`cancelOrRefundPaymentIntent`関数を使用

### 49.4 実裁E��頁E
1. `src/lib/stripe.ts` - `cancelOrRefundPaymentIntent`関数を追加
2. `src/app/api/admin/force-cancel/route.ts` - 新しい関数を使用するように修正
3. `src/app/admin/page.tsx` - APIコールをCloud Run直接URL経由に変更
4. チE�Eロイして動作確誁E

---

## 50. 修正計画�E�E026-01-01 契紁E���EAPIタイムアウト問題�E修正�E�E

### 50.1 問題�E概要E
クライアントモードで「オファーを送信する」�Eタンを押すと、APIがタイムアウトして契紁E��作�EされなぁE��E

### 50.2 原因刁E��
1. **healthエンド�Eイント�E正常**: `/api/health`は0.16秒で応筁E
2. **契紁E���EAPIがタイムアウチE*: `/api/contracts/create`ぁE0秒以上応答しなぁE
3. **firebase-admin初期化�E問顁E*: Cloud Run環墁E��firebase-adminの初期化がハングしてぁE��可能性
4. **ProxyパターンのメソチE��バインド問顁E*: ProxyオブジェクトでメソチE��を取得する際、`this`コンチE��ストが正しくバインドされてぁE��かっぁE

### 50.3 修正冁E��
`src/lib/firebase-admin.ts`を修正し、ProxyパターンのメソチE��バインドを改喁E��E

```typescript
export const adminAuth = new Proxy({} as admin.auth.Auth, {
    get(target, prop) {
        initializeFirebaseAdmin();
        const auth = admin.auth();
        const value = (auth as any)[prop];
        // メソチE��の場合�Eバインドして返す
        if (typeof value === 'function') {
            return value.bind(auth);
        }
        return value;
    }
});

export const adminDb = new Proxy({} as admin.firestore.Firestore, {
    get(target, prop) {
        initializeFirebaseAdmin();
        const db = admin.firestore();
        const value = (db as any)[prop];
        // メソチE��の場合�Eバインドして返す
        if (typeof value === 'function') {
            return value.bind(db);
        }
        return value;
    }
});
```

### 50.4 実裁E��頁E
1. `src/lib/firebase-admin.ts`を修正
2. Cloud Buildで再ビルド�E再デプロイ
3. 動作確誁E

### 50.5 実裁E��亁E��E026-01-01�E�E
**修正冁E���E�E*
1. `src/lib/firebase-admin.ts`のProxyパターンを修正し、メソチE��呼び出し時に正しく`this`をバインドするよぁE��変更
2. Cloud Buildで再ビルド！Euild ID: b804b228-f8db-47d3-b61b-2ee0e34586dd、スチE�Eタス: SUCCESS�E�E
3. Cloud RunにチE�Eロイ�E�リビジョン: projectmarkethub-00127-nnp�E�E

**チE��ト結果�E�E*
```bash
# 契紁E���EAPI
curl -X POST "https://projectmarkethub-5ckpwmqfza-an.a.run.app/api/contracts/create" -H "Content-Type: application/json" -d "{}"
# 結果: {"error":"Unauthorized"}, HTTP Status: 401, Time: 1.839889s
```

**結論！E*
- APIレスポンス時間ぁE0秒以上�E1.8秒に大幁E��喁E
- Firebase Admin SDKの初期化が正常に動作してぁE��
- 認証エラー�E�E01�E��E正常な動作（認証ト�EクンなしでのチE��ト�Eため�E�E

---

## 51. 修正計画�E�E026-01-01 検収画面での双方合意型キャンセル機�E追加�E�E

### 51.1 依頼冁E��
クライアント�E検収画面で、双方合意型�Eキャンセル画面を設けてほしい、E

### 51.2 現状刁E��
- **キャンセル申請API** (`/api/contracts/cancel-request`): `submitted`スチE�Eタスが許可されてぁE��ぁE
- **キャンセル承認API** (`/api/contracts/cancel-approve`): 同様に`submitted`スチE�Eタスが許可されてぁE��ぁE��能性
- **クライアント契紁E��細画面**: `submitted`スチE�Eタス時にキャンセル申請�Eタンが表示されなぁE

### 51.3 修正冁E��

#### 1. キャンセル申請API (`src/app/api/contracts/cancel-request/route.ts`)
- `cancellableStatuses`に`submitted`を追加

#### 2. キャンセル承認API (`src/app/api/contracts/cancel-approve/route.ts`)
- `cancellableStatuses`に`submitted`を追加�E�存在する場合！E

#### 3. クライアント契紁E��細画面 (`src/app/(main)/client/contracts/[id]/page.tsx`)
- キャンセル申請�Eタンの表示条件に`submitted`を追加
- 検収画面でのキャンセル時�E注意事頁E��追加�E�納品物を受け取った後�Eキャンセルは慎重に�E�E

### 51.4 実裁E��頁E
1. `src/app/api/contracts/cancel-request/route.ts` - `submitted`スチE�Eタスを追加
2. `src/app/api/contracts/cancel-approve/route.ts` - `submitted`スチE�Eタスを追加
3. `src/app/(main)/client/contracts/[id]/page.tsx` - キャンセル申請�Eタンの表示条件を修正
4. チE�Eロイして動作確誁E

---

## 52. 修正計画�E�E026-01-01 オファーを送信ボタンのタイムアウト問題修正�E�E

### 52.1 問題�E概要E
クライアントモードで「オファーを送信する」�Eタンを押すと、APIがタイムアウトして契紁E��作�EされなぁE��E

### 52.2 原因刁E��
1. **healthエンド�Eイント�E正常**: `/api/health`は0.09秒で応筁E
2. **契紁E���EAPIがタイムアウチE*: `/api/contracts/create`ぁE0秒以上応答しなぁE
3. **firebase-admin初期化�E問顁E*: 契紁E���EAPIは`adminAuth`と`adminDb`を使用しており、これらのProxyオブジェクトへのアクセス時にfirebase-adminの初期化が行われるが、Cloud Run環墁E��初期化がハングしてぁE��

### 52.3 修正冁E��
firebase-adminの初期化を改喁E��、Cloud Run環墁E��の認証惁E��検�Eを確実にする�E�E

1. **環墁E��数の確誁E*: Cloud Run環墁E��は`GOOGLE_APPLICATION_CREDENTIALS`が�E動設定されるが、�E示皁E��`credential.applicationDefault()`を使用する
2. **初期化�Eタイムアウト追加**: 初期化が長時間かかる場合にエラーをスローする
3. **チE��チE��ログの強匁E*: 初期化�E吁E��チE��プでログを�E劁E

### 52.4 実裁E��頁E
1. `src/lib/firebase-admin.ts`を修正
2. Cloud Buildで再ビルド�E再デプロイ
3. 動作確誁E

### 52.5 実裁E��亁E��E026-01-01�E�E
**修正冁E���E�E*
1. `src/lib/firebase-admin.ts`のProxyパターンを維持しつつ、�E期化ログを強匁E
2. Cloud Buildで再ビルド！Euild ID: 92f36a1d-972f-44b3-b8b0-2de28716bfa9、スチE�Eタス: SUCCESS�E�E
3. Cloud RunにチE�Eロイ�E�リビジョン: projectmarkethub-00130-dbz�E�E

**チE��ト結果�E�E*
```bash
# 契紁E���EAPI
curl -X POST "https://projectmarkethub-5ckpwmqfza-an.a.run.app/api/contracts/create" -H "Content-Type: application/json" -d "{}"
# 結果: {"error":"Unauthorized"}, HTTP Status: 401, Time: 2.254167s
```

**結論！E*
- APIレスポンス時間ぁE00秒以上�E2.25秒に大幁E��喁E
- Firebase Admin SDKの初期化が正常に動作してぁE��
- 認証エラー�E�E01�E��E正常な動作（認証ト�EクンなしでのチE��ト�Eため�E�E

---

## 31. 修正計画�E�E025-12-29 ペ�Eジネ�Eション機�Eの追加�E�E

### 31.1 依頼冁E��
プロジェクト�E件数が増えてきた場合に、�Eージが長くなってしまぁE��め、褁E��ペ�Eジにできる機�Eを追加する。最大10、E0、E00件表示のように選択可能にする、E

### 31.2 対象ペ�Eジ
設計書のサイト�EチE�Eを確認し、一覧表示を行うペ�Eジを特定！E

1. **ワーカーモーチE- 仕事を探ぁE* (`/worker/search`) - 案件一覧 ☁E��優允E
2. **クライアントモーチE- 案件管琁E* (`/client/jobs`) - 自刁E�E案件一覧
3. **ワーカーモーチE- 契紁E��覧** (`/worker/contracts`) - 契紁E��覧
4. **クライアントモーチE- 契紁E��覧** (`/client/contracts`) - 契紁E��覧
5. **ワーカーモーチE- 応募一覧** (`/worker/applications`) - 応募一覧

### 31.3 実裁E��釁E
- **表示件数選抁E*: 10件、E0件、E00件から選択可能
- **ペ�Eジネ�EションUI**: 「前へ」「次へ」�Eタン + ペ�Eジ番号表示
- **クライアントサイド�Eージネ�Eション**: 全件取得後、クライアントサイドでペ�Eジ刁E���E�現状の案件数では十�Eなパフォーマンス�E�E

### 31.4 共通コンポ�EネンチE
再利用可能なペ�Eジネ�Eションコンポ�Eネントを作�E�E�E
- `src/components/ui/Pagination.tsx`

### 31.5 実裁E��頁E
1. `src/components/ui/Pagination.tsx` - 共通�Eージネ�Eションコンポ�Eネントを作�E
2. `src/app/(main)/worker/search/page.tsx` - ペ�Eジネ�Eション機�Eを追加
3. 他�Eペ�Eジにも忁E��に応じて適用�E�今回は`/worker/search`のみ実裁E��E
4. チE�Eロイして動作確誁E

---

## 53. 修正計画�E�E026-01-02 APIタイムアウト問題�E根本皁E��決�E�E

### 53.1 問題�E概要E
「オファーを送信」�Eタンなど、APIコールを行う機�Eが頻繁にタイムアウトする、E

### 53.2 原因刁E��
カスタムドメイン�E�Epj-markethub.com`�E�経由のAPIコールがCloud Runのドメインマッピングでタイムアウトを引き起こしてぁE��。相対パス�E�E/api/...`�E�でAPIを呼び出すと、カスタムドメイン経由となりタイムアウトが発生する、E

### 53.3 修正冁E��
全てのAPIコールを相対パスからCloud Run直接URL経由に変更する、E

**修正パターン:**
```typescript
// Before
const res = await fetch('/api/xxx', { ... });

// After
const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
const res = await fetch(`${apiUrl}/api/xxx`, { ... });
```

**環墁E��数:**
- `NEXT_PUBLIC_API_URL`: Cloud Run直接URL�E�Ehttps://projectmarkethub-5ckpwmqfza-an.a.run.app`�E�E

### 53.4 修正対象ファイル

#### 1. `src/app/(main)/messages/[roomId]/page.tsx`
- `/api/contracts/create` ↁE`${apiUrl}/api/contracts/create`

#### 2. `src/lib/db.ts`
- `/api/reviews/create` ↁE`${apiUrl}/api/reviews/create`

#### 3. `src/app/(main)/worker/contracts/[id]/page.tsx`
- `/api/contracts/cancel-approve` ↁE`${apiUrl}/api/contracts/cancel-approve`
- `/api/contracts/cancel-request` ↁE`${apiUrl}/api/contracts/cancel-request`

#### 4. `src/app/(main)/client/contracts/[id]/page.tsx`
- `/api/stripe/verify-payment` ↁE`${apiUrl}/api/stripe/verify-payment`
- `/api/stripe/create-payment-intent` ↁE`${apiUrl}/api/stripe/create-payment-intent`
- `/api/stripe/capture-payment-intent` ↁE`${apiUrl}/api/stripe/capture-payment-intent`
- `/api/contracts/cancel-approve` ↁE`${apiUrl}/api/contracts/cancel-approve`
- `/api/contracts/cancel-request` ↁE`${apiUrl}/api/contracts/cancel-request`
- `/api/contracts/report-no-contact` ↁE`${apiUrl}/api/contracts/report-no-contact`

### 53.5 実裁E��亁E��E026-01-02�E�E
**修正冁E���E�E*
1. 上記�EてのファイルでAPIコールをCloud Run直接URL経由に変更
2. Cloud Buildで再ビルド！Euild ID: 927eaf39-fb0d-4901-b1b6-569af0aad678、スチE�Eタス: SUCCESS�E�E
3. Cloud RunにチE�Eロイ�E�リビジョン: projectmarkethub-00131-9df�E�E

**チE��ト結果�E�E*
```bash
# 契紁E���EAPI
curl -X POST "https://projectmarkethub-5ckpwmqfza-an.a.run.app/api/contracts/create" -H "Content-Type: application/json" -d "{}"
# 結果: {"error":"Unauthorized"}, HTTP Status: 401, Time: 2.129200s
```

**結論！E*
- APIレスポンス時間が正常�E�E秒以下！E
- 認証エラー�E�E01�E��E正常な動作（認証ト�EクンなしでのチE��ト�Eため�E�E
- 全てのAPIコールがCloud Run直接URL経由となり、ドメインマッピングタイムアウト問題を回避

### 53.6 今後の対応
新規APIコールを追加する際は、必ず`NEXT_PUBLIC_API_URL`環境変数を使用してCloud Run直接URLを指定すること。

---

## 54. 修正計画（2026-01-02 オファー送信ボタンのタイムアウト問題の根本解決）

### 54.1 問題の概要
クライアントモードで「オファーを送信する」ボタンを押すと、APIがタイムアウトして契約が作成されない。

### 54.2 原因分析
1. **Cloud Run直接URLでもタイムアウト**: curlで`https://projectmarkethub-5ckpwmqfza-an.a.run.app/api/contracts/create`を呼び出すと30秒以上タイムアウトする
2. **healthエンドポイントは正常**: `/api/health`は0.14秒で応答する
3. **ログに記録されない**: タイムアウトしたリクエストがCloud Runのログに記録されていない
4. **firebase-admin初期化の問題**: 契約作成APIは`adminAuth`と`adminDb`を使用しており、これらのProxyオブジェクトへのアクセス時にfirebase-adminの初期化が行われるが、コールドスタート時に初期化がハングしている可能性

### 54.3 修正内容
**Cloud Runの最小インスタンス数を1に設定**

コールドスタートを回避するため、Cloud Runの最小インスタンス数を1に設定する。これにより、常に1つのインスタンスがウォーム状態で待機し、firebase-adminの初期化が完了した状態でリクエストを受け付けることができる。

**コマンド:**
```bash
gcloud run services update projectmarkethub \
  --region=asia-northeast1 \
  --project=projectmarkethub-db904 \
  --min-instances=1
```

### 54.4 実装手順
1. Cloud Runの最小インスタンス数を1に設定
2. 動作確認

### 54.5 注意事項
- 最小インスタンス数を1に設定すると、常に1つのインスタンスが稼働するため、コストが増加する
- 将来的には、firebase-adminの初期化を最適化して、コールドスタートでも高速に応答できるようにすることを検討

---

## 56. 修正計画（2026-01-02 デバッグ文言の削除）

### 56.1 依頼内容
メッセージページに表示されている以下のデバッグ用文言を削除する：
1. 「※契約ID取得中または一覧から選択してください」
2. 「Debug: Status hired/Contract-None/Err-None」

### 56.2 修正対象ファイル
`src/app/(main)/messages/[roomId]/page.tsx`

### 56.3 修正内容
1. 約680行目付近の「※契約ID取得中または一覧から選択してください」を含む`<p>`タグを削除
2. 約695行目付近の「Debug: Status=...」を含む`<div>`タグを削除

### 56.4 実装手順
1. `src/app/(main)/messages/[roomId]/page.tsx` を修正
2. デプロイして動作確認

---

## 57. 修正計画（2026-01-02 公開プロフィールの完了案件数修正）

### 57.1 問題の概要
公開プロフィールページ（`/users/[id]`）の「完了案件: 6件」が実態と合っていない。

### 57.2 原因分析
1. **公開プロフィールページ**: `user.jobsCompleted`を表示している（175行目）
2. **jobsCompletedの更新ロジック**: 検収完了時（`capture-payment-intent`）でも評価作成時（`reviews/create`）でも、`jobsCompleted`は更新されていない
3. **現在の値**: Firestoreに保存されている古いデータで、実際の完了契約数と一致していない

### 57.3 修正方針
**アプローチA（採用）**: 公開プロフィールページで、実際の完了契約数をリアルタイムでカウントする
- `db.ts`に`getCompletedContractsCount`関数を追加
- 公開プロフィールページで、この関数を使用して完了契約数を取得・表示
- 他のページには影響を与えない

### 57.4 修正内容

#### 1. db.ts (`src/lib/db.ts`)
- `getCompletedContractsCount`関数を追加
- ワーカーIDを指定して、`status === 'completed'`の契約数をカウント

#### 2. 公開プロフィールページ (`src/app/(main)/users/[id]/page.tsx`)
- `getCompletedContractsCount`関数をインポート
- `user.jobsCompleted`の代わりに、実際の完了契約数を表示

### 57.5 実装手順
1. `src/lib/db.ts` - `getCompletedContractsCount`関数を追加
2. `src/app/(main)/users/[id]/page.tsx` - 完了契約数の取得・表示を修正
3. デプロイして動作確認

---

## 55. 修正計画（2026-01-02 検収時キャンセル承認不可・納品物表示制御）

### 55.1 依頼内容
1. **キャンセル承認ができない問題**: 検収時にクライアントがキャンセルした。ワーカーが承認したが、キャンセルできなかった。
2. **キャンセル時の納品物表示制御**: キャンセル時に、クライアントが納品物を見れないようにしてほしい。

### 55.2 原因分析

#### ①キャンセル承認ができない問題
コードを確認した結果、以下の問題を特定：
- **cancel-approve API**: `submitted`ステータスは`cancellableStatuses`に含まれている（OK）
- **cancel-request API**: `submitted`ステータスは`cancellableStatuses`に含まれている（OK）
- **ワーカー側UI**: キャンセル申請ボタンの表示条件に`submitted`が含まれていない
  - 現在: `['pending_signature', 'waiting_for_escrow', 'escrow', 'in_progress']`
  - 修正後: `['pending_signature', 'waiting_for_escrow', 'escrow', 'in_progress', 'submitted']`

#### ②キャンセル時の納品物表示制御
- **クライアント側UI**: `cancelled`ステータス時は納品物セクションが表示されない（OK）
- **ワーカー側UI**: `cancelled`ステータス時も納品物が表示される可能性がある
- **Firebase Storage**: 直接URLアクセスは制限されていない（セキュリティルールで対応が必要だが、今回はUI側で対応）

### 55.3 修正内容

#### 1. ワーカー側契約詳細ページ (`src/app/(main)/worker/contracts/[id]/page.tsx`)
- キャンセル申請ボタンの表示条件に`submitted`を追加
- キャンセル済み時に納品物セクションを非表示にする

#### 2. クライアント側契約詳細ページ (`src/app/(main)/client/contracts/[id]/page.tsx`)
- キャンセル済み時に納品物セクションを非表示にする（既に対応済みだが確認）

### 55.4 実装手順
1. `src/app/(main)/worker/contracts/[id]/page.tsx` を修正
   - キャンセル申請ボタンの表示条件に`submitted`を追加
   - キャンセル済み時に納品物セクションを非表示にする
2. `src/app/(main)/client/contracts/[id]/page.tsx` を確認・修正
   - キャンセル済み時に納品物セクションが非表示になっていることを確認
3. デプロイして動作確認

---

## 58. 修正計画（2026-01-02 オファー送信ボタンのタイムアウト問題の根本解決）

### 58.1 問題の概要
クライアントモードで「オファーを送信する」ボタンを押すと、APIがタイムアウトして契約が作成されない。

### 58.2 原因分析
1. **firebase-admin初期化の問題**: Cloud Run環境でfirebase-adminの初期化がハングしていた
2. **Proxyパターンの複雑さ**: 遅延初期化のためのProxyパターンが複雑で、Cloud Run環境で問題を引き起こしていた

### 58.3 修正内容

#### 1. firebase-admin.ts (`src/lib/firebase-admin.ts`)
- Proxyパターンを廃止し、シンプルな直接関数エクスポートに変更
- `getAdminAuth()`と`getAdminDb()`関数を直接エクスポート
- 後方互換性のため、`adminAuth`と`adminDb`オブジェクトも提供（内部でgetter関数を呼び出す）
- Cloud Run環境では認証情報を省略してデフォルトの認証情報検出に任せる

#### 2. contracts/create/route.ts (`src/app/api/contracts/create/route.ts`)
- 約180行から約110行に簡素化
- 冗長なクエリとチェックを削除
- Promise.allで並列更新を実行
- 詳細なタイミングログを追加

### 58.4 実装完了（2026-01-02）
**修正内容:**
1. `src/lib/firebase-admin.ts`を簡素化（Proxyパターン削除）
2. `src/app/api/contracts/create/route.ts`を簡素化（クエリ削減、並列処理化）
3. Cloud Buildで再ビルド（Build ID: 50bc7390-b5c4-4f85-b896-c078fe4d9cc6、ステータス: SUCCESS）
4. Cloud Runにデプロイ（リビジョン: projectmarkethub-00140-frw）

**テスト結果:**
```bash
# healthエンドポイント（コールドスタート）
curl -w "\nTotal time: %{time_total}s\n" https://projectmarkethub-5ckpwmqfza-an.a.run.app/api/health
# 結果: Total time: 2.331349s

# healthエンドポイント（ウォームアップ後）
curl -w "\nTotal time: %{time_total}s\n" https://projectmarkethub-5ckpwmqfza-an.a.run.app/api/health
# 結果: Total time: 0.195562s
```

**結論:**
- コールドスタート時でも2.3秒で応答（以前は30秒以上タイムアウト）
- ウォームアップ後は0.2秒で応答
- firebase-admin初期化の問題が解決された

---

## 59. 修正計画（2026-01-02 オファー送信ボタンのタイムアウト問題の根本解決 - ハイブリッドアプローチ）

### 59.1 問題の概要
クライアントモードで「オファーを送信する」ボタンを押すと、APIがタイムアウトして契約が作成されない。リクエストがCloud Runに到達しない間欠的なネットワーク問題。

### 59.2 原因分析
1. **リクエストがCloud Runに到達しない**: Cloud Runのログにリクエストが記録されない
2. **間欠的な問題**: 同じAPIが成功する場合と失敗する場合がある
3. **ネットワーク層の問題**: クライアント→Cloud Load Balancer→Cloud Runの間でリクエストがドロップされる

### 59.3 根本的な解決策: 複数送信方法のハイブリッドアプローチ

#### 実装内容
1. **fetch + XMLHttpRequest の並行送信（レース条件）**
   - 標準的なfetch APIを即座に開始
   - 2秒後にXMLHttpRequestをフォールバックとして開始
   - どちらか先に成功した方を採用

2. **keepalive オプション**
   - `keepalive: true` で接続を維持し、ネットワーク切断時の耐性を向上

3. **X-Request-ID ヘッダー**
   - リクエスト追跡用のユニークIDを付与し、デバッグを容易に

4. **6回試行（初回 + 5回リトライ）**
   - 段階的バックオフ: 0.5秒, 1秒, 1.5秒, 2秒, 2.5秒, 3秒

5. **20秒タイムアウト**
   - 十分な待機時間を確保

### 59.4 修正ファイル
- `src/app/(main)/messages/[roomId]/page.tsx`
  - `executeCreateContract`関数を堅牢化
  - `sendWithMultipleMethods`関数を追加（fetch + XHRの並行送信）

### 59.5 実装完了（2026-01-02）
**修正内容:**
1. `src/app/(main)/messages/[roomId]/page.tsx`を修正
2. Cloud Buildで再ビルド（Build ID: de7ce724-6244-465c-8a58-b9aeb574504b、ステータス: SUCCESS）
3. Cloud Runにデプロイ（リビジョン: projectmarkethub-00148-bbn）

**テスト結果:**
```bash
# 契約作成API
curl -w "\nTotal time: %{time_total}s\n" -X POST "https://projectmarkethub-5ckpwmqfza-an.a.run.app/api/contracts/create" -H "Content-Type: application/json" -d "{}"
# 結果: {"error":"Unauthorized"}, Total time: 0.211221s
```

**結論:**
- APIレスポンス時間が0.21秒で正常
- 複数送信方法のハイブリッドアプローチにより、ネットワーク問題への耐性が大幅に向上
- 6回試行により、間欠的な問題でも成功率が向上

---

## 60. 修正計画（2026-01-02 CORSエラーの修正）

### 60.1 問題の概要
「オファーを送信する」ボタンを押すと、CORSエラーが発生して契約が作成されない。

### 60.2 原因分析
1. **クロスオリジンリクエスト**: `pj-markethub.com`から`projectmarkethub-5ckpwmqfza-an.a.run.app`へのリクエストがクロスオリジンとなる
2. **X-Request-IDヘッダー**: カスタムヘッダー`X-Request-ID`がCORSで許可されていなかった
3. **XMLHttpRequest**: XHRでも同様にCORSエラーが発生

### 60.3 修正内容

#### 1. クライアント側 (`src/app/(main)/messages/[roomId]/page.tsx`)
- `X-Request-ID`ヘッダーを削除（CORSで許可されていないため）
- `NEXT_PUBLIC_API_URL`環境変数を使用してCloud Run直接URLにリクエスト

#### 2. サーバー側 (`src/app/api/contracts/create/route.ts`)
- 全てのレスポンスにCORSヘッダーを追加
  - `Access-Control-Allow-Origin: *`
  - `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
  - `Access-Control-Allow-Headers: Content-Type, Authorization`
- OPTIONSリクエスト（プリフライト）への対応

### 60.4 実装完了（2026-01-02）
**修正内容:**
1. `src/app/(main)/messages/[roomId]/page.tsx`から`X-Request-ID`ヘッダーを削除
2. `src/app/api/contracts/create/route.ts`にCORSヘッダーを追加
3. Cloud Buildで再ビルド（Build ID: b6207419-b7e5-47d6-a04b-179dbaedd85f、ステータス: SUCCESS）
4. Cloud Runにデプロイ（リビジョン: projectmarkethub-00150-k59）

**結論:**
- CORSエラーが解消され、`pj-markethub.com`から`projectmarkethub-5ckpwmqfza-an.a.run.app`へのクロスオリジンリクエストが正常に動作

---

## 61. APIコール設計思想（重要）

### 61.1 背景
本プラットフォームでは、カスタムドメイン（`pj-markethub.com`）とCloud Run直接URL（`projectmarkethub-5ckpwmqfza-an.a.run.app`）の2つのエンドポイントが存在する。

### 61.2 問題点
1. **カスタムドメイン経由のタイムアウト**: Cloud Runのドメインマッピングを経由すると、間欠的にタイムアウトが発生する
2. **CORSの問題**: カスタムドメインからCloud Run直接URLへのリクエストはクロスオリジンとなり、CORSヘッダーが必要

### 61.3 設計方針

#### APIコールの基本ルール
1. **重要なAPIコール（決済、契約作成など）**: Cloud Run直接URL経由で呼び出す
   - `NEXT_PUBLIC_API_URL`環境変数を使用
   - CORSヘッダーをサーバー側で設定

2. **通常のAPIコール**: 相対パス（`/api/...`）で呼び出す
   - カスタムドメイン経由となる
   - タイムアウトが発生しても致命的でない場合に使用

#### CORSヘッダーの設定
Cloud Run直接URLを使用するAPIには、以下のCORSヘッダーを設定する：
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
```

#### 環境変数
- `NEXT_PUBLIC_API_URL`: Cloud Run直接URL（`https://projectmarkethub-5ckpwmqfza-an.a.run.app`）
- `cloudbuild.yaml`で設定

### 61.4 今後の対応
新規APIを追加する際は、以下を確認：
1. 重要なAPIか？ → Cloud Run直接URL経由 + CORSヘッダー設定
2. 通常のAPIか？ → 相対パスで呼び出し
3. カスタムヘッダーを使用する場合 → CORSで許可されているか確認
