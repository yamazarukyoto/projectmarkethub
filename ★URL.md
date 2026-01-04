# Project Market Hub URLs

## 本番URL（カスタムドメイン）
https://pj-markethub.com/

## Cloud Run サービス
- **サービス名**: `projectmarkethub`
- **リージョン**: `asia-northeast1`
- **直接URL**: https://projectmarkethub-173689610587.asia-northeast1.run.app

## プロジェクト情報
- **GCPプロジェクトID**: `projectmarkethub-db904`
- **リージョン**: `asia-northeast1`

## ドメインマッピング
| ドメイン | マッピング先 |
|---------|-------------|
| pj-markethub.com | projectmarkethub |

## DNS設定（ドメインプロバイダーで設定）

### Aレコード（IPv4）
- 216.239.32.21
- 216.239.34.21
- 216.239.36.21
- 216.239.38.21

### AAAAレコード（IPv6）
- 2001:4860:4802:32::15
- 2001:4860:4802:34::15
- 2001:4860:4802:36::15
- 2001:4860:4802:38::15

## 注意事項
- Cloud Runの最小インスタンス数は `1` に設定されています（コールドスタート対策）
- 詳細は ★sekkei.md のセクション75を参照
