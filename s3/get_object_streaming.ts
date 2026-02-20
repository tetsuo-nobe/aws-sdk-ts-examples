import { 
    S3Client, 
    GetObjectCommand, 
    GetObjectCommandOutput
} from "@aws-sdk/client-s3";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import { BUCKET_NAME, DEFAULT_REGION } from "./config";

// ダウンロードするオブジェクトのキー
const OBJECT_KEY: string = "Eiffel.jpg";
// 保存先のファイルパス
const DOWNLOAD_PATH: string = "./s3/downloaded_Eiffel.jpg";

/**
 * ストリーミングを使ってS3バケットからオブジェクトをダウンロードする
 * @returns Promise<void>
 */
async function getObjectStreaming(): Promise<void> {
    const region: string = process.env.AWS_REGION || DEFAULT_REGION;
    
    // S3クライアントを作成
    const client: S3Client = new S3Client({ region });

    try {
        console.log("ダウンロード開始...");
        
        // GetObjectコマンドを実行
        const command: GetObjectCommand = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: OBJECT_KEY
        });

        const response: GetObjectCommandOutput = await client.send(command);

        // レスポンスのBodyをストリームとしてファイルに直接書き込む
        if (response.Body) {
            await pipeline(
                response.Body as NodeJS.ReadableStream,
                createWriteStream(DOWNLOAD_PATH)
            );
            
            displaySuccess(response);
        } else {
            throw new Error("レスポンスにBodyが含まれていません");
        }
    } catch (error) {
        handleError(error);
    }
}

/**
 * ダウンロード成功時のメッセージを表示
 * @param response - GetObjectコマンドのレスポンス
 */
function displaySuccess(response: GetObjectCommandOutput): void {
    console.log("\n✓ オブジェクトのダウンロード成功!");
    console.log("==============================");
    console.log(`バケット名: ${BUCKET_NAME}`);
    console.log(`オブジェクトキー: ${OBJECT_KEY}`);
    console.log(`保存先: ${DOWNLOAD_PATH}`);
    console.log(`ContentType: ${response.ContentType ?? "不明"}`);
    console.log(`ContentLength: ${response.ContentLength ?? "不明"} bytes`);
    console.log(`ETag: ${response.ETag ?? "不明"}`);
    console.log(`LastModified: ${response.LastModified?.toISOString() ?? "不明"}`);
}

/**
 * エラーハンドリング
 * @param error - キャッチされたエラー
 */
function handleError(error: unknown): never {
    if (error instanceof Error) {
        console.error("\n✗ エラーが発生しました:", error.message);
        
        // AWS SDKの一般的なエラーをチェック
        if (error.name === "NoSuchBucket") {
            console.error("指定されたバケットが存在しません。");
        } else if (error.name === "NoSuchKey") {
            console.error("指定されたオブジェクトが存在しません。");
        }
        
        console.error("スタックトレース:", error.stack);
    } else {
        console.error("\n✗ 予期しないエラーが発生しました:", error);
    }
    throw error;
}

// 実行
getObjectStreaming();
