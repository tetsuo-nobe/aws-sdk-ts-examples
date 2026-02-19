import { 
    S3Client, 
    DeleteBucketCommand, 
    DeleteBucketCommandOutput
} from "@aws-sdk/client-s3";
import { BUCKET_NAME, DEFAULT_REGION } from "./config";

/**
 * S3バケットを削除する
 * @returns Promise<void>
 */
async function deleteBucket(): Promise<void> {
    const region: string = process.env.AWS_REGION || DEFAULT_REGION;
    
    // S3クライアントを作成
    const client: S3Client = new S3Client({ region });

    try {
        // DeleteBucketコマンドを実行
        const command: DeleteBucketCommand = new DeleteBucketCommand({
            Bucket: BUCKET_NAME
        });

        const response: DeleteBucketCommandOutput = await client.send(command);

        displaySuccess();
    } catch (error) {
        handleError(error);
    }
}

/**
 * バケット削除成功時のメッセージを表示
 */
function displaySuccess(): void {
    console.log("✓ バケット削除成功!");
    console.log("==================");
    console.log(`バケット名: ${BUCKET_NAME}`);
}

/**
 * エラーハンドリング
 * @param error - キャッチされたエラー
 */
function handleError(error: unknown): never {
    if (error instanceof Error) {
        console.error("✗ エラーが発生しました:", error.message);
        
        // AWS SDKの一般的なエラーをチェック
        if (error.name === "NoSuchBucket") {
            console.error("指定されたバケットが存在しません。");
        } else if (error.name === "BucketNotEmpty") {
            console.error("バケットが空ではありません。先にオブジェクトを削除してください。");
        }
        
        console.error("スタックトレース:", error.stack);
    } else {
        console.error("✗ 予期しないエラーが発生しました:", error);
    }
    throw error;
}

// 実行
deleteBucket();
