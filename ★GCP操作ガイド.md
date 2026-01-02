# GCP�E�Eoogle Cloud Platform�E�操作ガイチE

## 1. プロジェクト管琁E

```bash
# プロジェクト一覧を表示
gcloud projects list

# 現在のプロジェクトを確誁E
gcloud config get-value project

# プロジェクトを刁E��替ぁE
gcloud config set project プロジェクチED

# プロジェクト�E詳細を表示
gcloud projects describe プロジェクチED

# プロジェクトを削除�E�注意！E��E
gcloud projects delete プロジェクチED

# 削除したプロジェクトを復允E��E0日以冁E��E
gcloud projects undelete プロジェクチED
```

## 2. Cloud Run�E�サーバ�EレスコンチE���E�E

```bash
# サービス一覧を表示
gcloud run services list --region=asia-northeast1 --project=プロジェクチED

# サービスの詳細を表示
gcloud run services describe サービス吁E--region=asia-northeast1 --project=プロジェクチED

# サービスのURLを取征E
gcloud run services describe サービス吁E--region=asia-northeast1 --project=プロジェクチED --format="value(status.url)"

# 新しいイメージをデプロイ
gcloud run deploy サービス吁E\
  --image=イメージURL \
  --region=asia-northeast1 \
  --project=プロジェクチED \
  --platform=managed \
  --allow-unauthenticated

# サービスを削除
gcloud run services delete サービス吁E--region=asia-northeast1 --project=プロジェクチED
```

## 3. Cloud Build�E�ビルド�E動化�E�E

```bash
# ビルドを実衁E
gcloud builds submit --config=cloudbuild.yaml --project=プロジェクチED

# ビルド履歴を表示
gcloud builds list --project=プロジェクチED --limit=5

# 特定�Eビルド�E詳細を表示
gcloud builds describe ビルドID --project=プロジェクチED
```

## 4. Artifact Registry�E�コンチE��イメージ保存！E

```bash
# リポジトリ一覧を表示
gcloud artifacts repositories list --project=プロジェクチED --location=asia-northeast1

# リポジトリを作�E
gcloud artifacts repositories create リポジトリ吁E\
  --repository-format=docker \
  --location=asia-northeast1 \
  --project=プロジェクチED

# イメージ一覧を表示
gcloud artifacts docker images list asia-northeast1-docker.pkg.dev/プロジェクチED/リポジトリ吁E
```

## 5. 課金管琁E

```bash
# 課金アカウント一覧を表示
gcloud billing accounts list

# プロジェクトに課金アカウントをリンク
gcloud billing projects link プロジェクチED --billing-account=課金アカウンチED

# プロジェクト�E課金情報を確誁E
gcloud billing projects describe プロジェクチED

# 課金を無効化（�Eロジェクトを停止�E�E
gcloud billing projects unlink プロジェクチED
```

## 6. ドメインマッピング

```bash
# ドメインマッピング一覧を表示
gcloud beta run domain-mappings list --region=asia-northeast1 --project=プロジェクチED

# ドメインマッピングを作�E
gcloud beta run domain-mappings create \
  --service=サービス吁E\
  --domain=ドメイン吁E\
  --region=asia-northeast1 \
  --project=プロジェクチED

# ドメインマッピングの詳細�E�ENS設定情報�E�を表示
gcloud beta run domain-mappings describe \
  --domain=ドメイン吁E\
  --region=asia-northeast1 \
  --project=プロジェクチED

# ドメインマッピングを削除
gcloud beta run domain-mappings delete \
  --domain=ドメイン吁E\
  --region=asia-northeast1 \
  --project=プロジェクチED
```

## 7. こ�Eプロジェクト用コマンチE

### サイトをビルド！E��プロイ�E�一括�E�E
```bash
gcloud builds submit --config=cloudbuild.yaml --project=projectmarkethub-db904
```

### Cloud RunにチE�Eロイ�E�イメージ持E��！E
```bash
gcloud run deploy projectmarkethub \
  --image=asia-northeast1-docker.pkg.dev/projectmarkethub-db904/projectmarkethub-repo/app:latest \
  --region=asia-northeast1 \
  --project=projectmarkethub-db904 \
  --platform=managed \
  --allow-unauthenticated
```

### サービスのURLを確誁E
```bash
gcloud run services describe projectmarkethub \
  --region=asia-northeast1 \
  --project=projectmarkethub-db904 \
  --format="value(status.url)"
```

### ビルド状況を確誁E
```bash
gcloud builds list --project=projectmarkethub-db904 --limit=5
```

## 8. GCPコンソール�E�Eeb UI�E�E

ブラウザでも操作できます！E

| サービス | URL |
|---------|-----|
| Cloud Console | https://console.cloud.google.com/ |
| Cloud Run | https://console.cloud.google.com/run?project=projectmarkethub-db904 |
| Cloud Build | https://console.cloud.google.com/cloud-build?project=projectmarkethub-db904 |
| Artifact Registry | https://console.cloud.google.com/artifacts?project=projectmarkethub-db904 |
| 課釁E| https://console.cloud.google.com/billing?project=projectmarkethub-db904 |

## 9. トラブルシューチE��ング

### サービスぁE03エラーを返す場吁E
1. Cloud Runのログを確誁E
2. イメージを�EチE�Eロイ
```bash
gcloud run deploy projectmarkethub \
  --image=asia-northeast1-docker.pkg.dev/projectmarkethub-db904/projectmarkethub-repo/app:latest \
  --region=asia-northeast1 \
  --project=projectmarkethub-db904 \
  --platform=managed \
  --allow-unauthenticated
```

### ビルドが失敗する場吁E
1. ビルドログを確誁E
```bash
gcloud builds log ビルドID --project=projectmarkethub-db904
```

### 課金が無効になってぁE��場吁E
```bash
gcloud billing projects link projectmarkethub-db904 --billing-account=01C214-213DA3-736CB1
```

## 10. プロジェクト情報

| 頁E�� | 値 |
|------|-----|
| プロジェクチED | `projectmarkethub-db904` |
| プロジェクト番号 | `173689610587` |
| リージョン | `asia-northeast1` |
| Cloud Run URL | https://projectmarkethub-5ckpwmqfza-an.a.run.app |
| カスタムドメイン | https://pj-markethub.com |

