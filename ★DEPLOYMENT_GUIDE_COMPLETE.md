AI Deployment Manifest: Project Market Hub

Role: Deployment Agent
Objective: Deploy "Project Market Hub" to Google Cloud Platform (Cloud Run) with Firebase integration.
Target Environment: Production (Asia-Northeast1)

================================================================================

🌍 Context & Configuration (コンテキストと設定)
================================================================================
AIエージェントはこの設定値を全てのコマンド実行時の定数として使用すること。

1.1 Project Identifiers (プロジェクト識別子)

GCP_PROJECT_ID: projectmarkethub

(Description: Google Cloud Project ID)

FIREBASE_PROJECT_ID: projectmarkethub-db904

(Description: Firebase Project ID)

PROJECT_NUMBER: 173689610587

(Description: GCP Project Number)

SERVICE_NAME: projectmarkethub

(Description: Cloud Run Service Name)

REGION: asia-northeast1

(Description: Default Region)

1.2 Infrastructure Specs (インフラ仕様)

ARTIFACT_REPO: projectmarkethub-repo

(Description: Artifact Registry Repository Name)

IMAGE_PATH: asia-northeast1-docker.pkg.dev/projectmarkethub/projectmarkethub-repo/app:latest

(Description: Full Docker Image URI)

CUSTOM_DOMAIN: project-market-hub.com

(Description: Primary Domain)

DNS_ZONE: project-market-hub-com

(Description: Cloud DNS Zone Name)

1.3 Required Secrets (必須シークレット)

実行時に以下の環境変数が注入されていることを前提とする。

FIREBASE_API_KEY

FIREBASE_AUTH_DOMAIN

FIREBASE_STORAGE_BUCKET

FIREBASE_MESSAGING_SENDER_ID

FIREBASE_APP_ID

STRIPE_SECRET_KEY

STRIPE_WEBHOOK_SECRET

FIREBASE_SERVICE_ACCOUNT_EMAIL

FIREBASE_PRIVATE_KEY

================================================================================ 2. 🛠 Toolchain Verification (ツールチェーン検証)

デプロイプロセスを開始する前に、以下のコマンドで環境適合性をチェックすること。

# Verify gcloud authentication and project setting
gcloud config get-value project | grep -q "projectmarkethub" || echo "ERROR: Wrong GCP Project"

# Verify Docker daemon is running
docker info > /dev/null 2>&1 || echo "ERROR: Docker is not running"

# Verify Firebase CLI login
firebase projects:list > /dev/null 2>&1 || echo "ERROR: Firebase CLI not authenticated"


================================================================================ 3. 🚀 Execution Sequence (実行シーケンス)

AIエージェントは以下のフェーズを順次実行する。各フェーズでエラーが発生した場合は直ちに中断(Abort)すること。

Phase 1: Infrastructure Initialization (インフラ初期化)

(注: 冪等性を確保するため、リソースが存在しない場合のみ作成するロジックを含む)

1.1 Enable Required APIs

gcloud services enable \
  run.googleapis.com \
  containerregistry.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  firestore.googleapis.com \
  firebase.googleapis.com \
  dns.googleapis.com \
  --project projectmarkethub


1.2 Ensure Artifact Registry Exists

gcloud artifacts repositories describe projectmarkethub-repo \
  --location=asia-northeast1 \
  --project=projectmarkethub \
  || gcloud artifacts repositories create projectmarkethub-repo \
    --repository-format=docker \
    --location=asia-northeast1 \
    --project=projectmarkethub


Phase 2: Build & Deploy (ビルドとデプロイ)

**重要: 環境変数の注入について**

Next.jsの `NEXT_PUBLIC_` 環境変数はビルド時にインライン化されるため、ビルドプロセス中に環境変数を渡す必要があります。
`gcloud run deploy --source .` ではビルド時の環境変数を渡すことが難しいため、以下の2段階の手順を推奨します。

1. `gcloud builds submit` でDockerイメージをビルドし、Artifact Registryにプッシュする。
   この際、`cloudbuild.yaml` を使用してビルド引数（`--build-arg`）として環境変数を渡す。
2. `gcloud run deploy` でプッシュされたイメージをCloud Runにデプロイする。

**Dockerfileの修正**

Dockerfileには以下の `ARG` と `ENV` が追加されている必要があります。

```dockerfile
# Accept build arguments
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID

# Set environment variables for build
ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ENV NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID
```

2.1 Build Image with Cloud Build

`cloudbuild.yaml` を使用してビルドを実行します。

```yaml
# cloudbuild.yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: [
      'build',
      '-t', 'asia-northeast1-docker.pkg.dev/projectmarkethub/projectmarkethub-repo/app:latest',
      '--build-arg', 'NEXT_PUBLIC_FIREBASE_API_KEY=${_NEXT_PUBLIC_FIREBASE_API_KEY}',
      '--build-arg', 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${_NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}',
      '--build-arg', 'NEXT_PUBLIC_FIREBASE_PROJECT_ID=${_NEXT_PUBLIC_FIREBASE_PROJECT_ID}',
      '--build-arg', 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${_NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}',
      '--build-arg', 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${_NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID}',
      '--build-arg', 'NEXT_PUBLIC_FIREBASE_APP_ID=${_NEXT_PUBLIC_FIREBASE_APP_ID}',
      '.'
    ]
images:
  - 'asia-northeast1-docker.pkg.dev/projectmarkethub/projectmarkethub-repo/app:latest'
```

コマンド実行:

```bash
gcloud builds submit --config cloudbuild.yaml --substitutions "_NEXT_PUBLIC_FIREBASE_API_KEY=${FIREBASE_API_KEY},_NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${FIREBASE_AUTH_DOMAIN},_NEXT_PUBLIC_FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID},_NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${FIREBASE_STORAGE_BUCKET},_NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${FIREBASE_MESSAGING_SENDER_ID},_NEXT_PUBLIC_FIREBASE_APP_ID=${FIREBASE_APP_ID}"
```

2.2 Deploy to Cloud Run

ビルドされたイメージを使用してデプロイします。ここではランタイム環境変数（`STRIPE_SECRET_KEY` など）を設定します。

```bash
gcloud run deploy projectmarkethub \
  --image asia-northeast1-docker.pkg.dev/projectmarkethub/projectmarkethub-repo/app:latest \
  --platform managed \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --project projectmarkethub \
  --set-env-vars "STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY},STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}"
```

[Validation Criteria]

Exit Code: 0

Output contains Service URL.

Phase 3: Domain & Networking (ドメインとネットワーク)

3.1 Verify Domain Mapping

gcloud beta run domain-mappings describe \
  --domain project-market-hub.com \
  --region asia-northeast1 \
  --project projectmarkethub \
  || gcloud beta run domain-mappings create \
    --service projectmarkethub \
    --domain project-market-hub.com \
    --region asia-northeast1 \
    --project projectmarkethub


3.2 DNS Record Verification (Read-Only Check)

AIは現在のDNSレコードがGoogleの指定するIPと一致するか確認する必要がある。

# Check A Record
nslookup -type=A project-market-hub.com
# Expected: 216.239.32.21

# Check AAAA Record
nslookup -type=AAAA project-market-hub.com
# Expected: 2001:4860:4802:32::15


================================================================================ 4. 🔍 Verification Protocols (検証プロトコル)

デプロイ完了後、以下のヘルスチェックを実行する。

4.1 HTTP Availability Check

# Check HTTP Status 200 via curl
curl -I -f [https://project-market-hub.com](https://project-market-hub.com)


4.2 SSL Certificate Status

gcloud beta run domain-mappings describe \
  --domain project-market-hub.com \
  --region asia-northeast1 \
  --project projectmarkethub \
  --format="value(status.resourceRecords)"


(注: SSL証明書の発行には時間がかかる場合があるため、失敗時は Retry-After: 60s でポーリングを行うこと)

================================================================================ 5. ⚠️ Error Handling Strategies (エラーハンドリング戦略)

Case: "Docker build failed due to missing files"

Action: Dockerfile 内の COPY 命令を確認する。特に public フォルダや .env ファイルの参照エラーをチェック。

Recovery: COPY --from=builder /app/public ./public の行を条件付きコピーに変更するか削除する。

Case: "Permission Denied"

Action: サービスアカウント権限を確認。

Command: gcloud projects get-iam-policy projectmarkethub

Required Roles: roles/run.admin, roles/storage.admin, roles/iam.serviceAccountUser

Case: "Client-side Application Error (White Screen)"

Action: ブラウザのコンソールログを確認し、Firebaseなどの初期化エラーがないかチェックする。
Cause: `NEXT_PUBLIC_` 環境変数がビルド時に正しく注入されていない可能性がある。
Recovery: Phase 2の手順に従い、`gcloud builds submit` で環境変数を明示的に渡して再ビルドする。

================================================================================ 6. File Structure Expectation (期待されるファイル構造)

AIが操作するディレクトリには最低限以下が存在すること。

.
├── Dockerfile          # Must contain ARG and ENV for NEXT_PUBLIC_ variables
├── cloudbuild.yaml     # For passing build arguments
├── next.config.js      # Must contain "output: 'standalone'"
├── package.json
└── src/                # Source code

================================================================================ 7. Google Authentication Integration (Google認証統合)

メールアドレスでの登録に加えて、Googleアカウントで登録、ログインできる構造を追加済み。
- src/lib/firebase.ts: GoogleAuthProviderの初期化を追加
- src/app/(auth)/register/page.tsx: Google登録ボタンと処理を追加
- src/app/(auth)/login/page.tsx: Googleログインボタンと処理を追加

================================================================================ 8. ⚠️ Cloud Run URL に関する重要な注意点

**問題の背景:**
Cloud Runサービスを再作成したり、特定の操作を行うと、Cloud RunのサービスURLが変更されることがあります。
このURLは `NEXT_PUBLIC_API_URL` 環境変数として使用されており、フロントエンドからAPIを呼び出す際に使用されます。

**現在のCloud Run URL:**
```
https://projectmarkethub-5ckpwmqfza-an.a.run.app
```

**注意:** Cloud Runには2つのURL形式があります：
- 旧形式: `https://projectmarkethub-5ckpwmqfza-an.a.run.app`
- 新形式: `https://projectmarkethub-173689610587.asia-northeast1.run.app`

どちらも同じサービスを指しますが、`cloudbuild.yaml`では旧形式を使用しています。

**URLが変更された場合の症状:**
- APIコールがタイムアウトする
- ボタンを押しても「送信中...」のまま固まる
- ネットワークエラーが発生する

**デプロイ前の確認手順:**

1. 現在のCloud Run URLを確認:
```bash
gcloud run services describe projectmarkethub --region=asia-northeast1 --format="value(status.url)" --project=projectmarkethub-db904
```

2. `cloudbuild.yaml` の `_NEXT_PUBLIC_API_URL` が上記URLと一致しているか確認

3. 一致していない場合は `cloudbuild.yaml` を更新してから再ビルド・デプロイ

**cloudbuild.yaml の該当箇所:**
```yaml
substitutions:
  ...
  _NEXT_PUBLIC_API_URL: 'https://projectmarkethub-5ckpwmqfza-an.a.run.app'
```

**注意:** URLが変更された場合、必ず再ビルドが必要です。Cloud Runへのデプロイだけでは反映されません。
