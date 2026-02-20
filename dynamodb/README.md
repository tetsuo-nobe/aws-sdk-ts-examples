# Amazon DynamoDB サンプルコード

このフォルダには、AWS SDK for JavaScript v3を使用したAmazon DynamoDBの基本的な操作を実装したTypeScriptコードが含まれています。

## 前提条件

- Node.js がインストールされていること
- AWS認証情報が設定されていること（環境変数、AWS CLI、IAMロールなど）
- 必要なパッケージがインストールされていること

```bash
npm install
```

## 設定ファイル

### config.ts
DynamoDB操作の共通設定を定義しています。

- `TABLE_NAME`: テーブル名（GameScores）
- `GSI_NAME`: グローバルセカンダリインデックス名（GameScoreIndex）
- `DEFAULT_REGION`: デフォルトリージョン（ap-northeast-1）

### score_data.json
テーブルに投入するサンプルデータです。10件のゲームスコアデータが含まれています。

## テーブル構造

### GameScoresテーブル
- パーティションキー: `user_id` (String)
- ソートキー: `game_id` (String)
- 属性: `score` (Number), `life` (Number)
- プロビジョニングスループット: RCU 1, WCU 1

### GameScoreIndex (GSI)
- パーティションキー: `game_id` (String)
- ソートキー: `score` (Number)
- プロジェクションタイプ: ALL
- プロビジョニングスループット: RCU 1, WCU 1

## コードファイル一覧

### 1. create_table.ts
DynamoDBテーブルを作成します。

```bash
ts-node dynamodb/create_table.ts
```

- テーブル名: GameScores
- パーティションキー: user_id、ソートキー: game_id
- `waitUntilTableExists`を使用してテーブルがACTIVEになるまで待機

### 2. put_item.ts
score_data.jsonからデータを読み込み、テーブルにアイテムを追加します。

```bash
ts-node dynamodb/put_item.ts
```

- 10件のゲームスコアデータを順次追加
- 各アイテムの追加結果を表示

### 3. get_item.ts
指定したキーのアイテムを取得します（user_id=3, game_id=G001）。

```bash
ts-node dynamodb/get_item.ts
```

3つの取得方法を実行:
- 結果整合性での取得（ConsistentRead: false）
- 強力な整合性での取得（ConsistentRead: true）
- 属性を限定した取得（ProjectionExpression）

### 4. update_item.ts
条件付きでアイテムを更新します。

```bash
ts-node dynamodb/update_item.ts
```

- user_id=3, game_id=G001のアイテムを更新
- 条件: scoreが3000以上の場合のみlifeを1増加
- `ConditionExpression`と`UpdateExpression`を使用

### 5. query.ts
パーティションキーを指定してアイテムをクエリします。

```bash
ts-node dynamodb/query.ts
```

- user_id=3のアイテムを全て取得
- `KeyConditionExpression`を使用

### 6. add_gsi.ts
グローバルセカンダリインデックス（GSI）を追加します。

```bash
ts-node dynamodb/add_gsi.ts
```

- GSI名: GameScoreIndex
- パーティションキー: game_id、ソートキー: score
- 10秒ごとにステータスをチェックし、ACTIVEになるまで待機

### 7. query_gsi.ts
GSIを使用してアイテムをクエリします。

```bash
ts-node dynamodb/query_gsi.ts
```

- game_id=G001でscoreが3000以上のアイテムを取得
- `IndexName`でGSIを指定

### 8. partiQL.ts
PartiQL（SQLライクな構文）を使用してアイテムを取得します。

```bash
ts-node dynamodb/partiQL.ts
```

- `SELECT game_id, score, life FROM GameScores WHERE user_id = ?`
- user_id=3のアイテムを取得

### 9. scan.ts
テーブル全体をスキャンし、条件に一致するアイテムを取得します。

```bash
ts-node dynamodb/scan.ts
```

- lifeが3以上のアイテムを全て取得
- `FilterExpression`を使用
- 注意: Scanは全テーブルをスキャンするため、大量データでは非効率

### 10. delete_item.ts
指定したキーのアイテムを削除します。

```bash
ts-node dynamodb/delete_item.ts
```

- user_id=3, game_id=G001のアイテムを削除
- `ReturnValues: "ALL_OLD"`で削除前の値を取得

### 11. delete_table.ts
DynamoDBテーブルを削除します。

```bash
ts-node dynamodb/delete_table.ts
```

- GameScoresテーブルを削除
- `waitUntilTableNotExists`を使用してテーブルが完全に削除されるまで待機

## 実行順序の推奨

1. `create_table.ts` - テーブル作成
2. `put_item.ts` - データ投入
3. `get_item.ts` - アイテム取得
4. `query.ts` - クエリ実行
5. `update_item.ts` - アイテム更新
6. `add_gsi.ts` - GSI追加
7. `query_gsi.ts` - GSIを使用したクエリ
8. `partiQL.ts` - PartiQLクエリ
9. `scan.ts` - スキャン
10. `delete_item.ts` - アイテム削除
11. `delete_table.ts` - テーブル削除

## 注意事項

- DynamoDB操作にはAWS認証情報が必要です
- テーブル作成・削除、GSI追加は時間がかかる場合があります
- Scan操作は大量データでは非効率なため、可能な限りQueryを使用してください
- プロビジョニングスループットが低い（RCU/WCU=1）ため、大量データの操作には適していません

## 参考リンク

- [AWS SDK for JavaScript v3 - DynamoDB Client](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-dynamodb/)
- [Amazon DynamoDB Developer Guide](https://docs.aws.amazon.com/dynamodb/)
