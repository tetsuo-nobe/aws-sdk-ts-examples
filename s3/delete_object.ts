import { 
    S3Client, 
    DeleteObjectCommand, 
    DeleteObjectCommandOutput
} from "@aws-sdk/client-s3";
import { BUCKET_NAME, DEFAULT_REGION } from "./config";

// 削除するオブジェクトのキー
const OBJECT_KEY: string = "cat.jpg";

/**
 * S3バケットからオブジェクトを削除する
 * @returns Promise<void>
 */
async function deleteObject(): Promise<void> {
    const region: string = process.env.AWS_REGION || DEFAULT_REGION;
    
    // S3クライアントを作成
    const client: S3Client = new S3Client({ region });

    try {
        // DeleteObjectコマンドを実行
        const command: DeleteObjectCommand = new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: OBJECT_KEY
        });

        const response: DeleteObjectCommandOutput = await client.send(command);

        displaySuccess(response);
    } catch (error) {
        handleError(error);
    }
}

/**
 * 削除成功時のメッセージを表示
 * @param response - DeleteObjectコマンドのレスポンス
 */
function displaySuccess(response: DeleteObjectCommandOutput): void {
    console.log("✓ オブジェクトの削除成功!");
    console.log("========================");
    console.log(`バケット名: ${BUCKET_NAME}`);
    console.log(`オブジェクトキー: ${OBJECT_KEY}`);
    
    if (response.DeleteMarker) {
        console.log(`DeleteMarker: ${response.DeleteMarker}`);
    }
    if (response.VersionId) {
        console.log(`VersionId: ${response.VersionId}`);
    }
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
        }
        
        console.error("スタックトレース:", error.stack);
    } else {
        console.error("✗ 予期しないエラーが発生しました:", error);
    }
    throw error;
}

// 実行
deleteObject();
