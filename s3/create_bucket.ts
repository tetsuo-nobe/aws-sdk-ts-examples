import { 
    S3Client, 
    CreateBucketCommand, 
    CreateBucketCommandOutput,
    BucketLocationConstraint 
} from "@aws-sdk/client-s3";
import { BUCKET_NAME, DEFAULT_REGION } from "./config";

/**
 * S3バケットを作成する
 * @returns Promise<void>
 */
async function createBucket(): Promise<void> {
    const region: string = process.env.AWS_REGION || DEFAULT_REGION;
    
    // S3クライアントを作成
    const client: S3Client = new S3Client({ region });

    try {
        // CreateBucketコマンドを実行
        const command: CreateBucketCommand = new CreateBucketCommand({
            Bucket: BUCKET_NAME,
            // us-east-1以外のリージョンではLocationConstraintが必要
            ...(region !== "us-east-1" && {
                CreateBucketConfiguration: {
                    LocationConstraint: region as BucketLocationConstraint
                }
            })
        });

        const response: CreateBucketCommandOutput = await client.send(command);

        displaySuccess(response);
    } catch (error) {
        handleError(error);
    }
}

/**
 * バケット作成成功時のメッセージを表示
 * @param response - CreateBucketコマンドのレスポンス
 */
function displaySuccess(response: CreateBucketCommandOutput): void {
    console.log("✓ バケット作成成功!");
    console.log("==================");
    console.log(`バケット名: ${BUCKET_NAME}`);
    console.log(`ロケーション: ${response.Location ?? "不明"}`);
}

/**
 * エラーハンドリング
 * @param error - キャッチされたエラー
 */
function handleError(error: unknown): never {
    if (error instanceof Error) {
        console.error("✗ エラーが発生しました:", error.message);
        
        // AWS SDKの一般的なエラーをチェック
        if (error.name === "BucketAlreadyExists") {
            console.error("このバケット名は既に使用されています。");
        } else if (error.name === "BucketAlreadyOwnedByYou") {
            console.error("このバケットは既にあなたが所有しています。");
        }
        
        console.error("スタックトレース:", error.stack);
    } else {
        console.error("✗ 予期しないエラーが発生しました:", error);
    }
    throw error;
}

// 実行
createBucket();
