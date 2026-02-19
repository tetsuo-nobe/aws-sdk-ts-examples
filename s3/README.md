# S3 操作スクリプト

このフォルダには、AWS SDK for JavaScript v3を使用したS3操作のTypeScriptコードが含まれています。

## 特徴

- AWS SDK v3の最新の書き方を使用
- TypeScriptの型システムを活用した型安全なコード
- 設定ファイル（config.ts）による一元管理
- 適切なエラーハンドリングとわかりやすいメッセージ

## ファイル構成

- `config.ts` - バケット名やリージョンなどの設定を管理
- `list_bucket.ts` - S3バケットの一覧を取得して出力
- `create_bucket.ts` - S3バケットを作成
- `delete_bucket.ts` - S3バケットを削除

## 実行前の準備

1. プロジェクトのルートディレクトリ（aws-sdk-ts）に移動:
```bash
cd aws-sdk-ts
```

2. 依存パッケージのインストール:
```bash
npm install
```

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

### list_bucket.ts - バケット一覧の取得

S3バケットの一覧を表示します。

```bash
npx ts-node s3/list_bucket.ts
```

### create_bucket.ts - バケットの作成

config.tsで指定したバケットを作成します。

```bash
npx ts-node s3/create_bucket.ts
```

注意:
- バケット名はグローバルで一意である必要があります
- us-east-1以外のリージョンでは自動的にLocationConstraintが設定されます

### delete_bucket.ts - バケットの削除

config.tsで指定したバケットを削除します。

```bash
npx ts-node s3/delete_bucket.ts
```

注意:
- バケットは空でないと削除できません
- バケット内にオブジェクトがある場合は、先にすべて削除する必要があります

## トラブルシューティング

### "Region is missing" エラー

AWS_REGION環境変数を設定するか、`~/.aws/config`ファイルでリージョンを設定してください。

### "BucketAlreadyExists" エラー

バケット名が既に使用されています。config.tsで別の名前に変更してください。

### "BucketNotEmpty" エラー

バケット内にオブジェクトが残っています。先にすべてのオブジェクトを削除してください。
