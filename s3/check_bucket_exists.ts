import { 
    S3Client, 
    HeadBucketCommand,
    HeadBucketCommandOutput
} from "@aws-sdk/client-s3";
import { BUCKET_NAME, DEFAULT_REGION } from "./config";

/**
 * バケットの存在とアクセス権限をチェックする
 * @returns Promise<void>
 */
async function checkBucketExists(): Promise<void> {
    const region: string = process.env.AWS_REGION || DEFAULT_REGION;
    
    // S3クライアントを作成
    const client: S3Client = new S3Client({ region });

    console.log(`バケット "${BUCKET_NAME}" の存在確認中...\n`);

    try {
        // HeadBucketコマンドを実行
        const command: HeadBucketCommand = new HeadBucketCommand({
            Bucket: BUCKET_NAME
        });

        const response: HeadBucketCommandOutput = await client.send(command);

        displaySuccess(response);
    } catch (error) {
        handleError(error);
    }
}

/**
 * バケット存在確認成功時のメッセージを表示
 * @param response - HeadBucketコマンドのレスポンス
 */
function displaySuccess(response: HeadBucketCommandOutput): void {
    console.log("✓ バケットは存在し、アクセス可能です!");
    console.log("================================");
    console.log(`バケット名: ${BUCKET_NAME}`);
    
    if (response.BucketRegion) {
        console.log(`バケットリージョン: ${response.BucketRegion}`);
    }
    
    if (response.AccessPointAlias !== undefined) {
        console.log(`アクセスポイントエイリアス: ${response.AccessPointAlias}`);
    }
    
    console.log("\nステータス: アクセス権限あり");
}

/**
 * エラーハンドリング
 * @param error - キャッチされたエラー
 */
function handleError(error: unknown): never {
    if (error instanceof Error) {
        console.error("✗ バケットチェック失敗");
        console.error("===================");
        console.error(`バケット名: ${BUCKET_NAME}`);
        
        // エラーの種類に応じて詳細なメッセージを表示
        if (error.name === "NotFound" || error.message.includes("404")) {
            console.error("\nステータス: バケットが存在しません");
            console.error("原因:");
            console.error("  - バケット名が間違っている");
            console.error("  - バケットが削除されている");
            console.error("  - 別のAWSアカウントのバケット");
        } else if (error.name === "Forbidden" || error.message.includes("403")) {
            console.error("\nステータス: アクセス権限がありません");
            console.error("原因:");
            console.error("  - バケットは存在するが、読み取り権限がない");
            console.error("  - IAMポリシーで許可されていない");
            console.error("  - バケットポリシーでアクセスが拒否されている");
        } else if (error.name === "BadRequest" || error.message.includes("400")) {
            console.error("\nステータス: 不正なリクエスト");
            console.error("原因:");
            console.error("  - バケット名の形式が不正");
        } else {
            console.error(`\nエラー: ${error.message}`);
        }
        
        console.error("\nスタックトレース:", error.stack);
    } else {
        console.error("✗ 予期しないエラーが発生しました:", error);
    }
    throw error;
}

// 実行
checkBucketExists();
