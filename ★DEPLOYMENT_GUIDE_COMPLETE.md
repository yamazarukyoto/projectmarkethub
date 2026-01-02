AI Deployment Manifest: Project Market Hub

Role: Deployment Agent
Objective: Deploy "Project Market Hub" to Google Cloud Platform (Cloud Run) with Firebase integration.
Target Environment: Production (Asia-Northeast1)

================================================================================

🌍 Context & Configuration (コンチE��ストと設宁E
================================================================================
AIエージェント�Eこ�E設定値を�Eてのコマンド実行時の定数として使用すること、E

1.1 Project Identifiers (プロジェクト識別孁E

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

1.2 Infrastructure Specs (インフラ仕槁E

ARTIFACT_REPO: projectmarkethub-repo

(Description: Artifact Registry Repository Name)

IMAGE_PATH: asia-northeast1-docker.pkg.dev/projectmarkethub/projectmarkethub-repo/app:latest

(Description: Full Docker Image URI)

CUSTOM_DOMAIN: pj-markethub.com

(Description: Primary Domain)

DNS_ZONE: project-market-hub-com

(Description: Cloud DNS Zone Name)

1.3 Required Secrets (忁E��シークレチE��)

実行時に以下�E環墁E��数が注入されてぁE��ことを前提とする、E

FIREBASE_API_KEY

FIREBASE_AUTH_DOMAIN

FIREBASE_STORAGE_BUCKET

FIREBASE_MESSAGING_SENDER_ID

FIREBASE_APP_ID

STRIPE_SECRET_KEY

STRIPE_WEBHOOK_SECRET

FIREBASE_SERVICE_ACCOUNT_EMAIL

FIREBASE_PRIVATE_KEY

================================================================================ 2. 🛠 Toolchain Verification (チE�Eルチェーン検証)

チE�Eロイプロセスを開始する前に、以下�Eコマンドで環墁E��合性をチェチE��すること、E

# Verify gcloud authentication and project setting
gcloud config get-value project | grep -q "projectmarkethub" || echo "ERROR: Wrong GCP Project"

# Verify Docker daemon is running
docker info > /dev/null 2>&1 || echo "ERROR: Docker is not running"

# Verify Firebase CLI login
firebase projects:list > /dev/null 2>&1 || echo "ERROR: Firebase CLI not authenticated"


================================================================================ 3. 🚀 Execution Sequence (実行シーケンス)

AIエージェント�E以下�Eフェーズを頁E��実行する。各フェーズでエラーが発生した場合�E直ちに中断(Abort)すること、E

Phase 1: Infrastructure Initialization (インフラ初期匁E

(注: 冪等性を確保するため、リソースが存在しなぁE��合�Eみ作�EするロジチE��を含む)

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


Phase 2: Build & Deploy (ビルドとチE�Eロイ)

**重要E 環墁E��数の注入につぁE��**

Next.jsの `NEXT_PUBLIC_` 環墁E��数はビルド時にインライン化されるため、ビルド�Eロセス中に環墁E��数を渡す忁E��があります、E
`gcloud run deploy --source .` ではビルド時の環墁E��数を渡すことが難しいため、以下�E2段階�E手頁E��推奨します、E

1. `gcloud builds submit` でDockerイメージをビルドし、Artifact Registryにプッシュする、E
   こ�E際、`cloudbuild.yaml` を使用してビルド引数�E�E--build-arg`�E�として環墁E��数を渡す、E
2. `gcloud run deploy` でプッシュされたイメージをCloud RunにチE�Eロイする、E

**Dockerfileの修正**

Dockerfileには以下�E `ARG` と `ENV` が追加されてぁE��忁E��があります、E

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

`cloudbuild.yaml` を使用してビルドを実行します、E

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

コマンド実衁E

```bash
gcloud builds submit --config cloudbuild.yaml --substitutions "_NEXT_PUBLIC_FIREBASE_API_KEY=${FIREBASE_API_KEY},_NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${FIREBASE_AUTH_DOMAIN},_NEXT_PUBLIC_FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID},_NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${FIREBASE_STORAGE_BUCKET},_NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${FIREBASE_MESSAGING_SENDER_ID},_NEXT_PUBLIC_FIREBASE_APP_ID=${FIREBASE_APP_ID}"
```

2.2 Deploy to Cloud Run

ビルドされたイメージを使用してチE�Eロイします。ここではランタイム環墁E��数�E�ESTRIPE_SECRET_KEY` など�E�を設定します、E

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
  --domain pj-markethub.com \
  --region asia-northeast1 \
  --project projectmarkethub \
  || gcloud beta run domain-mappings create \
    --service projectmarkethub \
    --domain pj-markethub.com \
    --region asia-northeast1 \
    --project projectmarkethub


3.2 DNS Record Verification (Read-Only Check)

AIは現在のDNSレコードがGoogleの持E��するIPと一致するか確認する忁E��がある、E

# Check A Record
nslookup -type=A pj-markethub.com
# Expected: 216.239.32.21

# Check AAAA Record
nslookup -type=AAAA pj-markethub.com
# Expected: 2001:4860:4802:32::15


================================================================================ 4. 🔍 Verification Protocols (検証プロトコル)

チE�Eロイ完亁E��、以下�EヘルスチェチE��を実行する、E

4.1 HTTP Availability Check

# Check HTTP Status 200 via curl
curl -I -f [https://pj-markethub.com](https://pj-markethub.com)


4.2 SSL Certificate Status

gcloud beta run domain-mappings describe \
  --domain pj-markethub.com \
  --region asia-northeast1 \
  --project projectmarkethub \
  --format="value(status.resourceRecords)"


(注: SSL証明書の発行には時間がかかる場合があるため、失敗時は Retry-After: 60s でポ�Eリングを行うこと)

================================================================================ 5. ⚠�E�EError Handling Strategies (エラーハンドリング戦略)

Case: "Docker build failed due to missing files"

Action: Dockerfile 冁E�E COPY 命令を確認する。特に public フォルダめE.env ファイルの参�EエラーをチェチE��、E

Recovery: COPY --from=builder /app/public ./public の行を条件付きコピ�Eに変更するか削除する、E

Case: "Permission Denied"

Action: サービスアカウント権限を確認、E

Command: gcloud projects get-iam-policy projectmarkethub

Required Roles: roles/run.admin, roles/storage.admin, roles/iam.serviceAccountUser

Case: "Client-side Application Error (White Screen)"

Action: ブラウザのコンソールログを確認し、Firebaseなどの初期化エラーがなぁE��チェチE��する、E
Cause: `NEXT_PUBLIC_` 環墁E��数がビルド時に正しく注入されてぁE��ぁE��能性がある、E
Recovery: Phase 2の手頁E��従い、`gcloud builds submit` で環墁E��数を�E示皁E��渡して再ビルドする、E

================================================================================ 6. File Structure Expectation (期征E��れるファイル構造)

AIが操作するディレクトリには最低限以下が存在すること、E

.
├── Dockerfile          # Must contain ARG and ENV for NEXT_PUBLIC_ variables
├── cloudbuild.yaml     # For passing build arguments
├── next.config.js      # Must contain "output: 'standalone'"
├── package.json
└── src/                # Source code

================================================================================ 7. Google Authentication Integration (Google認証統吁E

メールアドレスでの登録に加えて、Googleアカウントで登録、ログインできる構造を追加済み、E
- src/lib/firebase.ts: GoogleAuthProviderの初期化を追加
- src/app/(auth)/register/page.tsx: Google登録ボタンと処琁E��追加
- src/app/(auth)/login/page.tsx: Googleログインボタンと処琁E��追加

================================================================================ 8. ⚠�E�ECloud Run URL に関する重要な注意点

**問題�E背景:**
Cloud Runサービスを�E作�Eしたり、特定�E操作を行うと、Cloud RunのサービスURLが変更されることがあります、E
こ�EURLは `NEXT_PUBLIC_API_URL` 環墁E��数として使用されており、フロントエンドからAPIを呼び出す際に使用されます、E

**現在のCloud Run URL:**
```
https://projectmarkethub-5ckpwmqfza-an.a.run.app
```

**注愁E** Cloud Runには2つのURL形式があります！E
- 旧形弁E `https://projectmarkethub-5ckpwmqfza-an.a.run.app`
- 新形弁E `https://projectmarkethub-173689610587.asia-northeast1.run.app`

どちらも同じサービスを指しますが、`cloudbuild.yaml`では旧形式を使用してぁE��す、E

**URLが変更された場合�E痁E��:**
- APIコールがタイムアウトすめE
- ボタンを押しても「送信中...」�Eまま固まめE
- ネットワークエラーが発生すめE

**チE�Eロイ前�E確認手頁E**

1. 現在のCloud Run URLを確誁E
```bash
gcloud run services describe projectmarkethub --region=asia-northeast1 --format="value(status.url)" --project=projectmarkethub-db904
```

2. `cloudbuild.yaml` の `_NEXT_PUBLIC_API_URL` が上記URLと一致してぁE��か確誁E

3. 一致してぁE��ぁE��合�E `cloudbuild.yaml` を更新してから再ビルド�EチE�Eロイ

**cloudbuild.yaml の該当箁E��:**
```yaml
substitutions:
  ...
  _NEXT_PUBLIC_API_URL: 'https://projectmarkethub-5ckpwmqfza-an.a.run.app'
```

**注愁E** URLが変更された場合、忁E��再ビルドが忁E��です、Eloud RunへのチE�Eロイだけでは反映されません、E

