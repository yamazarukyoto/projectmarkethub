
---

## 83. 修正計画（2026-01-04 PDF生成機能の微修正）

### 83.1 依頼内容
1. **領収書**:
   - 但し書きを「但 案件「●●」の代金として」に変更。
   - 領収書番号を「YYYYMMDD + 3桁の通り番号」に変更。
2. **支払調書**:
   - 明細行の文字配置を下罫線寄りに調整。

### 83.2 実装内容

#### 1. PDF生成ロジック修正 (`src/lib/pdf-generator.ts`)
- **領収書**:
  - 但し書きのフォーマットを変更。
  - 領収書番号生成ロジックを変更：
    - 日付部分: 検収完了日 (`completedAt`) を使用。
    - 番号部分: 契約IDのハッシュ値から一意の3桁の数値を生成する関数 `generateSerialNumber` を実装。
- **支払調書**:
  - `textY` の計算式を `y + rowHeight - 2` に変更し、文字を下寄せに配置。

### 83.3 変更ファイル
1. `src/lib/pdf-generator.ts`

---

## 84. 修正計画（2026-01-04 契約作成時の税計算修正）

### 84.1 問題内容
契約詳細ページで税計算が間違っていた：
- **表示されていた値**: 税抜 999円 / 消費税 101円 / 税込 1,100円
- **正しい値**: 税抜 1,000円 / 消費税 100円 / 税込 1,100円

### 84.2 原因
`src/app/api/contracts/create/route.ts` の税計算で `Math.floor()` を使用していたため、切り捨てによる誤差が発生していた。

```javascript
// 修正前（問題あり）
const amountExcludingTax = Math.floor(price / 1.1);
```

### 84.3 修正内容
`Math.round()` を使用し、より正確な計算式に変更：

```javascript
// 修正後
const amountExcludingTax = Math.round(price * 10 / 11);
const tax = price - amountExcludingTax;
```

### 84.4 計算例
- 税込金額 `price = 1100` の場合
- `Math.round(1100 * 10 / 11) = Math.round(1000) = 1000`（税抜）
- `tax = 1100 - 1000 = 100`（消費税）

### 84.5 変更ファイル
1. `src/app/api/contracts/create/route.ts`

### 84.6 備考
- この修正は新規契約作成時にのみ適用される
- 既存の契約データは変更されない（必要であればFirestoreを直接修正）
