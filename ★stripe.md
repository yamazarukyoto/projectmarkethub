# Stripe Keys

## 本番環境で使用するキー

- **Publishable Key:** `pk_test_51SM2wG8IGGSBqsbGMda1pqXnVHrKQlapODosqa5f2hRDb29Nqdnfh4vTZkKsOMKSlCYO32NQ6jQ0IaPJcckf5Ine00ocvGelY7`
- **Secret Key:** `sk_test_51SM2wG8IGGSBqsbG...` (セキュリティのため省略)
- **Webhook Secret:** `whsec_2Y5vENSW9XFV6Rfv8jWZZH2EdPU5LZRk`

## 設定場所

| 設定項目 | 設定場所 |
|---------|---------|
| STRIPE_SECRET_KEY | Cloud Run環境変数 |
| STRIPE_WEBHOOK_SECRET | Cloud Run環境変数 |
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | cloudbuild.yaml (ビルド時に埋め込み) |

## 注意事項

⚠️ **重要**: 以下のキーは**使用しないでください**（古いアカウント）:
- `pk_test_51SM2rh7B9svSOs6Y...`
- `sk_test_51SM2rh7B9svSOs6Y...`

正しいキーは `51SM2wG8IGGSBqsbG` で始まるものです。

## Webhook設定

Stripeダッシュボードで以下のエンドポイントを設定:
- URL: `https://pj-markethub.com/api/webhooks/stripe`
- イベント: `payment_intent.succeeded`, `payment_intent.payment_failed` など
