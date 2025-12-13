# GCP（Google Cloud Platform）操作ガイド

## 1. プロジェクト管理

```bash
# プロジェクト一覧を表示
gcloud projects list

# 現在のプロジェクトを確認
gcloud config get-value project

# プロジェクトを切り替え
gcloud config set project プロジェクトID

# プロジェクトの詳細を表示
gcloud projects describe プロジェクトID

# プロジェクトを削除（注意！）
gcloud projects delete プロジェクトID

# 削除したプロジェクトを復元（30日以内）
gcloud projects undelete プロジェクトID
```

## 2. Cloud Run（サーバーレスコンテナ）

```bash
# サービス一覧を表示
gcloud run services list --region=asia-northeast1 --project=プロジェクトID

# サービスの詳細を表示
gcloud run services describe サービス名 --region=asia-northeast1 --project=プロジェクトID

# サービスのURLを取得
gcloud run services describe サービス名 --region=asia-northeast1 --project=プロジェクトID --format="value(status.url)"

# 新しいイメージをデプロイ
gcloud run deploy サービス名 \
  --image=イメージURL \
  --region=asia-northeast1 \
  --project=プロジェクトID \
  --platform=managed \
  --allow-unauthenticated

# サービスを削除
gcloud run services delete サービス名 --region=asia-northeast1 --project=プロジェクトID
```

## 3. Cloud Build（ビルド自動化）

```bash
# ビルドを実行
gcloud builds submit --config=cloudbuild.yaml --project=プロジェクトID

# ビルド履歴を表示
gcloud builds list --project=プロジェクトID --limit=5

# 特定のビルドの詳細を表示
gcloud builds describe ビルドID --project=プロジェクトID
```

## 4. Artifact Registry（コンテナイメージ保存）

```bash
# リポジトリ一覧を表示
gcloud artifacts repositories list --project=プロジェクトID --location=asia-northeast1

# リポジトリを作成
gcloud artifacts repositories create リポジトリ名 \
  --repository-format=docker \
  --location=asia-northeast1 \
  --project=プロジェクトID

# イメージ一覧を表示
gcloud artifacts docker images list asia-northeast1-docker.pkg.dev/プロジェクトID/リポジトリ名
```

## 5. 課金管理

```bash
# 課金アカウント一覧を表示
gcloud billing accounts list

# プロジェクトに課金アカウントをリンク
gcloud billing projects link プロジェクトID --billing-account=課金アカウントID

# プロジェクトの課金情報を確認
gcloud billing projects describe プロジェクトID

# 課金を無効化（プロジェクトを停止）
gcloud billing projects unlink プロジェクトID
```

## 6. ドメインマッピング

```bash
# ドメインマッピング一覧を表示
gcloud beta run domain-mappings list --region=asia-northeast1 --project=プロジェクトID

# ドメインマッピングを作成
gcloud beta run domain-mappings create \
  --service=サービス名 \
  --domain=ドメイン名 \
  --region=asia-northeast1 \
  --project=プロジェクトID

# ドメインマッピングの詳細（DNS設定情報）を表示
gcloud beta run domain-mappings describe \
  --domain=ドメイン名 \
  --region=asia-northeast1 \
  --project=プロジェクトID

# ドメインマッピングを削除
gcloud beta run domain-mappings delete \
  --domain=ドメイン名 \
  --region=asia-northeast1 \
  --project=プロジェクトID
```

## 7. このプロジェクト用コマンド

### サイトをビルド＆デプロイ（一括）
```bash
gcloud builds submit --config=cloudbuild.yaml --project=projectmarkethub-db904
```

### Cloud Runにデプロイ（イメージ指定）
```bash
gcloud run deploy projectmarkethub \
  --image=asia-northeast1-docker.pkg.dev/projectmarkethub-db904/projectmarkethub-repo/app:latest \
  --region=asia-northeast1 \
  --project=projectmarkethub-db904 \
  --platform=managed \
  --allow-unauthenticated
```

### サービスのURLを確認
```bash
gcloud run services describe projectmarkethub \
  --region=asia-northeast1 \
  --project=projectmarkethub-db904 \
  --format="value(status.url)"
```

### ビルド状況を確認
```bash
gcloud builds list --project=projectmarkethub-db904 --limit=5
```

## 8. GCPコンソール（Web UI）

ブラウザでも操作できます：

| サービス | URL |
|---------|-----|
| Cloud Console | https://console.cloud.google.com/ |
| Cloud Run | https://console.cloud.google.com/run?project=projectmarkethub-db904 |
| Cloud Build | https://console.cloud.google.com/cloud-build?project=projectmarkethub-db904 |
| Artifact Registry | https://console.cloud.google.com/artifacts?project=projectmarkethub-db904 |
| 課金 | https://console.cloud.google.com/billing?project=projectmarkethub-db904 |

## 9. トラブルシューティング

### サービスが503エラーを返す場合
1. Cloud Runのログを確認
2. イメージを再デプロイ
```bash
gcloud run deploy projectmarkethub \
  --image=asia-northeast1-docker.pkg.dev/projectmarkethub-db904/projectmarkethub-repo/app:latest \
  --region=asia-northeast1 \
  --project=projectmarkethub-db904 \
  --platform=managed \
  --allow-unauthenticated
```

### ビルドが失敗する場合
1. ビルドログを確認
```bash
gcloud builds log ビルドID --project=projectmarkethub-db904
```

### 課金が無効になっている場合
```bash
gcloud billing projects link projectmarkethub-db904 --billing-account=01C214-213DA3-736CB1
```

## 10. プロジェクト情報

| 項目 | 値 |
|------|-----|
| プロジェクトID | `projectmarkethub-db904` |
| プロジェクト番号 | `173689610587` |
| リージョン | `asia-northeast1` |
| Cloud Run URL | https://projectmarkethub-5ckpwmqfza-an.a.run.app |
| カスタムドメイン | https://project-market-hub.com |
