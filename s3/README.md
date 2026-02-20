# S3 操作スクリプト

このフォルダには、AWS SDK for JavaScript v3を使用したS3操作のTypeScriptコードが含まれています。

## 特徴

- AWS SDK v3の最新の書き方を使用
- TypeScriptの型システムを活用した型安全なコード
- 設定ファイル（config.ts）による一元管理
- 適切なエラーハンドリングとわかりやすいメッセージ
- ストリーミング処理による効率的なファイル操作

## ファイル構成

### 設定ファイル
- `config.ts` - バケット名やリージョンなどの設定を一元管理

### バケット操作
- `list_bucket.ts` - S3バケットの一覧を取得して出力
- `create_bucket.ts` - S3バケットを作成
- `delete_bucket.ts` - S3バケットを削除
- `check_bucket_exists.ts` - バケットの存在とアクセス権限を確認

### オブジェクト操作（アップロード）
- `put_object.ts` - オブジェクトをアップロード（シンプル実装）
- `upload_file.ts` - ストリーミングでファイルをアップロード（進捗表示あり）

### オブジェクト操作（ダウンロード）
- `get_object.ts` - オブジェクトをダウンロード（メモリ経由）
- `get_object_streaming.ts` - ストリーミングでダウンロード（メモリ効率が良い）

### オブジェクト操作（削除）
- `delete_object.ts` - 単一のオブジェクトを削除
- `delete_all_objects.ts` - バケット内のすべてのオブジェクトを一括削除

### 署名付きURL
- `generate_presigned_url.ts` - 署名付きURLを生成してアップロード・ダウンロード

## 実行前の準備

1. プロジェクトのルートディレクトリ（aws-sdk-ts）に移動:
```bash
cd aws-sdk-ts
```

2. 依存パッケージのインストール:
```bash
npm install
```

必要なパッケージ:
- `@aws-sdk/client-s3` - S3クライアント
- `@aws-sdk/lib-storage` - ファイルアップロード用（upload_file.ts）
- `@aws-sdk/s3-request-presigner` - 署名付きURL生成用（generate_presigned_url.ts）

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

バケット名やデフォルトリージョンを変更する場合は、`config.ts`を編集してください:

```typescript
export const BUCKET_NAME: string = "your-bucket-name";
export const DEFAULT_REGION: string = "ap-northeast-1";
```

## 各スクリプトの実行方法

### バケット操作

#### list_bucket.ts - バケット一覧の取得

S3バケットの一覧を表示します。

```bash
npx ts-node s3/list_bucket.ts
```

#### create_bucket.ts - バケットの作成

config.tsで指定したバケットを作成します。

```bash
npx ts-node s3/create_bucket.ts
```

注意:
- バケット名はグローバルで一意である必要があります
- us-east-1以外のリージョンでは自動的にLocationConstraintが設定されます

#### delete_bucket.ts - バケットの削除

config.tsで指定したバケットを削除します。

```bash
npx ts-node s3/delete_bucket.ts
```

注意:
- バケットは空でないと削除できません
- 先に`delete_all_objects.ts`でオブジェクトを削除してください

#### check_bucket_exists.ts - バケットの存在確認

バケットの存在とアクセス権限を確認します。

```bash
npx ts-node s3/check_bucket_exists.ts
```

### オブジェクト操作（アップロード）

#### put_object.ts - シンプルなアップロード

cat.jpgをバケットにアップロードします（小さなファイル向け）。

```bash
npx ts-node s3/put_object.ts
```

#### upload_file.ts - ストリーミングアップロード

Eiffel.jpgをストリーミングでアップロードします（大きなファイルにも対応、進捗表示あり）。

```bash
npx ts-node s3/upload_file.ts
```

推奨: 大きなファイルや本番環境ではこちらを使用してください。

### オブジェクト操作（ダウンロード）

#### get_object.ts - シンプルなダウンロード

cat.jpgをダウンロードして保存します（メモリ経由）。

```bash
npx ts-node s3/get_object.ts
```

#### get_object_streaming.ts - ストリーミングダウンロード

Eiffel.jpgをストリーミングでダウンロードします（メモリ効率が良い）。

```bash
npx ts-node s3/get_object_streaming.ts
```

推奨: 大きなファイルや本番環境ではこちらを使用してください。

### オブジェクト操作（削除）

#### delete_object.ts - 単一オブジェクトの削除

cat.jpgを削除します。

```bash
npx ts-node s3/delete_object.ts
```

#### delete_all_objects.ts - すべてのオブジェクトを削除

バケット内のすべてのオブジェクトを一括削除します。

```bash
npx ts-node s3/delete_all_objects.ts
```

注意:
- この操作は元に戻せません
- 1000個以上のオブジェクトにも対応（自動的にバッチ処理）

### 署名付きURL

#### generate_presigned_url.ts - 署名付きURLの生成と使用

cherry.jpgをアップロード用URLでアップロードし、ダウンロード用URLを生成します。

```bash
npx ts-node s3/generate_presigned_url.ts
```

特徴:
- アップロード用URL: 有効期限1時間
- ダウンロード用URL: 有効期限20秒
- 認証情報なしでアクセス可能な一時URL

## トラブルシューティング

### "Region is missing" エラー

AWS_REGION環境変数を設定するか、`~/.aws/config`ファイルでリージョンを設定してください。

### "BucketAlreadyExists" エラー

バケット名が既に使用されています。config.tsで別の名前に変更してください。

### "BucketNotEmpty" エラー

バケット内にオブジェクトが残っています。`delete_all_objects.ts`を実行してからバケットを削除してください。

### "NoSuchBucket" エラー

指定されたバケットが存在しません。`check_bucket_exists.ts`で確認してください。

### "NoSuchKey" エラー

指定されたオブジェクトが存在しません。オブジェクトキー名を確認してください。

### "ENOENT" エラー

ローカルファイルが見つかりません。ファイルパスを確認してください。

## 実装パターンの比較

### アップロード
- `put_object.ts`: シンプル、小さなファイル向け、メモリに全体を読み込む
- `upload_file.ts`: ストリーミング、大きなファイル対応、進捗表示、メモリ効率が良い

### ダウンロード
- `get_object.ts`: シンプル、小さなファイル向け、メモリ経由
- `get_object_streaming.ts`: ストリーミング、大きなファイル対応、メモリ効率が良い

### 推奨事項
- 小さなファイル（数MB以下）: put_object.ts / get_object.ts
- 大きなファイル（数MB以上）: upload_file.ts / get_object_streaming.ts
- 本番環境: ストリーミング版を推奨
