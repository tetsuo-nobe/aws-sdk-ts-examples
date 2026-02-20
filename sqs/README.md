# Amazon SQS サンプルコード

このフォルダには、AWS SDK for JavaScript v3を使用したAmazon SQS（Simple Queue Service）の基本的な操作を実装したTypeScriptコードが含まれています。

## 特徴

- AWS SDK v3の最新の書き方を使用
- TypeScriptの型システムを活用した型安全なコード
- 設定ファイル（config.ts）による一元管理
- 適切なエラーハンドリングとわかりやすいメッセージ
- ショートポーリングとロングポーリングの両方に対応
- バッチ送信による効率的なメッセージ処理

## ファイル構成

### 設定ファイル
- `config.ts` - キュー名やリージョンなどの設定を一元管理
- `types.ts` - 注文情報の型定義
- `order_data.json` - サンプルの注文データ（10件）

### キュー操作
- `create_queue.ts` - 標準SQSキューを作成
- `delete_queue.ts` - SQSキューを削除

### メッセージ送信
- `send_message.ts` - 1件のメッセージを送信
- `send_message_batch.ts` - 複数のメッセージをバッチ送信（最大10件）

### メッセージ受信
- `receive_message.ts` - メッセージを受信（ショートポーリング）
- `receive_message_longpolling.ts` - メッセージを受信（ロングポーリング）
- `receive_all_messages.ts` - キューが空になるまで全メッセージを受信

## 実行前の準備

1. プロジェクトのルートディレクトリに移動:
```bash
cd aws-sdk-ts-examples
```

2. 依存パッケージのインストール:
```bash
npm install
```

必要なパッケージ:
- `@aws-sdk/client-sqs` - SQSクライアント

3. AWS認証情報の設定（以下のいずれか）:
   - 環境変数:
     - `AWS_ACCESS_KEY_ID`
     - `AWS_SECRET_ACCESS_KEY`
     - `AWS_REGION`（例: ap-northeast-1）
   - `~/.aws/credentials`ファイル
   - `~/.aws/config`ファイルでリージョンを設定
   - IAMロール（EC2やLambdaで実行する場合）

注意: リージョンが設定されていない場合、デフォルトで東京リージョン（ap-northeast-1）が使用されます。

## 設定のカスタマイズ

キュー名やデフォルトリージョンを変更する場合は、`config.ts`を編集してください:

```typescript
export const QUEUE_NAME: string = "order_queue";
export const DEFAULT_REGION: string = "ap-northeast-1";
```

## 各スクリプトの実行方法

### キュー操作

#### create_queue.ts - キューの作成

標準SQSキュー（order_queue）を作成します。

```bash
npx ts-node sqs/create_queue.ts
```

キュー設定:
- DelaySeconds: 0秒
- MessageRetentionPeriod: 4日間
- VisibilityTimeout: 30秒
- ReceiveMessageWaitTimeSeconds: 0秒（ショートポーリング）

注意:
- 同じ名前のキューが既に存在する場合は、既存のキューURLを返します

#### delete_queue.ts - キューの削除

order_queueを削除します。

```bash
npx ts-node sqs/delete_queue.ts
```

注意:
- キュー削除後60秒間は同じ名前のキューを作成できません

### メッセージ送信

#### send_message.ts - 単一メッセージの送信

1件のダミー注文データをキューに送信します。

```bash
npx ts-node sqs/send_message.ts
```

特徴:
- メッセージ属性（OrderType、Priority）を付与
- 送信結果（メッセージID、MD5ハッシュ）を表示

#### send_message_batch.ts - バッチ送信

order_data.jsonから10件の注文データをバッチ送信します。

```bash
npx ts-node sqs/send_message_batch.ts
```

特徴:
- `SendMessageBatch` APIを使用
- 最大10件を1回のAPIコールで送信
- APIコール数を最大90%削減
- バッチごとの成功/失敗を個別に表示

推奨: 複数のメッセージを送信する場合はこちらを使用してください。

### メッセージ受信

#### receive_message.ts - ショートポーリング受信

キューからメッセージを受信します（ショートポーリング）。

```bash
npx ts-node sqs/receive_message.ts
```

特徴:
- WaitTimeSeconds=0（即座にレスポンス）
- 最大10件のメッセージを一度に受信
- 正常に処理できたメッセージのみ削除
- 処理に失敗したメッセージはキューに残る

#### receive_message_longpolling.ts - ロングポーリング受信

キューからメッセージを受信します（ロングポーリング）。

```bash
npx ts-node sqs/receive_message_longpolling.ts
```

特徴:
- WaitTimeSeconds=20（最大20秒待機）
- メッセージが到着するまで待機
- 空のレスポンスを減らし、コスト効率が良い
- 正常に処理できたメッセージのみ削除

推奨: 通常はロングポーリングを使用してください。

#### receive_all_messages.ts - 全メッセージ受信

キューが空になるまで全てのメッセージを受信します。

```bash
npx ts-node sqs/receive_all_messages.ts
```

特徴:
- ロングポーリングを使用して繰り返し受信
- キューにメッセージがなくなるまで自動的にループ
- バッチごとの処理結果と全体の統計を表示
- 大量のメッセージを一括処理する際に便利

## トラブルシューティング

### "Region is missing" エラー

AWS_REGION環境変数を設定するか、`~/.aws/config`ファイルでリージョンを設定してください。

### "QueueDoesNotExist" エラー

キューが存在しません。`create_queue.ts`を実行してキューを作成してください。

### "QueueDeletedRecently" エラー

キューが最近削除されました。60秒待ってから再度作成してください。

### "InvalidMessageContents" エラー

メッセージの内容が無効です。メッセージ本文とメッセージ属性を確認してください。

### "TooManyEntriesInBatchRequest" エラー

バッチリクエストのエントリ数が多すぎます（最大10件）。

## ショートポーリング vs ロングポーリング

### ショートポーリング（WaitTimeSeconds=0）
- メッセージがない場合、即座に空のレスポンスを返す
- APIコール数が多くなる可能性がある
- リアルタイム性が高い

### ロングポーリング（WaitTimeSeconds=1〜20）
- メッセージがない場合、指定秒数待機してからレスポンスを返す
- 空のレスポンスを減らし、APIコール数を削減
- コスト効率が良い
- **推奨される方法**

## バッチ送信のメリット

`SendMessageBatch`を使用すると:
- 最大10件のメッセージを1回のAPIコールで送信
- APIコール数を最大90%削減
- スループットの向上
- コスト削減

## メッセージの可視性タイムアウト

メッセージを受信すると、`VisibilityTimeout`（デフォルト30秒）の間、他のコンシューマーから見えなくなります。この時間内に処理を完了し、`DeleteMessage`で削除する必要があります。削除しない場合、タイムアウト後に再度受信可能になります。

## 実装パターンの比較

### メッセージ送信
- `send_message.ts`: 単一メッセージ、シンプル
- `send_message_batch.ts`: バッチ送信、効率的、複数メッセージ向け

### メッセージ受信
- `receive_message.ts`: ショートポーリング、即座にレスポンス
- `receive_message_longpolling.ts`: ロングポーリング、コスト効率が良い
- `receive_all_messages.ts`: 全メッセージ受信、一括処理向け

### 推奨事項
- 単一メッセージ送信: send_message.ts
- 複数メッセージ送信: send_message_batch.ts
- メッセージ受信: receive_message_longpolling.ts（ロングポーリング推奨）
- 一括処理: receive_all_messages.ts

## 参考リンク

- [AWS SDK for JavaScript v3 - SQS Client](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-sqs/)
- [Amazon SQS Developer Guide](https://docs.aws.amazon.com/sqs/)
- [SQS Best Practices](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-best-practices.html)

