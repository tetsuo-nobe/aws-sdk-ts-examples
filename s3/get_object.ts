import { 
    S3Client, 
    GetObjectCommand, 
    GetObjectCommandOutput
} from "@aws-sdk/client-s3";
import { writeFileSync } from "fs";
import { BUCKET_NAME, DEFAULT_REGION } from "./config";

// ダウンロードするオブジェクトのキー
const OBJECT_KEY: string = "cat.jpg";
// 保存先のファイルパス
const DOWNLOAD_PATH: string = "./s3/downloaded_cat.jpg";

/**
 * S3バケットからオブジェクトをダウンロードする
 * @returns Promise<void>
 */
async function getObject(): Promise<void> {
    const region: string = process.env.AWS_REGION || DEFAULT_REGION;
    
    // S3クライアントを作成
    const client: S3Client = new S3Client({ region });

    try {
        // GetObjectコマンドを実行
        const command: GetObjectCommand = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: OBJECT_KEY
        });

        const response: GetObjectCommandOutput = await client.send(command);

        // レスポンスのBodyをバッファに変換
        if (response.Body) {
            const bodyContents = await streamToBuffer(response.Body);
            
            // ファイルに保存
            writeFileSync(DOWNLOAD_PATH, bodyContents);
            
            displaySuccess(response);
        } else {
            throw new Error("レスポンスにBodyが含まれていません");
        }
    } catch (error) {
        handleError(error);
    }
}

/**
 * ストリームをBufferに変換
 * @param stream - 読み取り可能なストリーム
 * @returns Promise<Buffer>
 */
async function streamToBuffer(stream: any): Promise<Buffer> {
    const chunks: Uint8Array[] = [];
    
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    
    return Buffer.concat(chunks);
}

/**
 * ダウンロード成功時のメッセージを表示
 * @param response - GetObjectコマンドのレスポンス
 */
function displaySuccess(response: GetObjectCommandOutput): void {
    console.log("✓ オブジェクトのダウンロード成功!");
    console.log("==============================");
    console.log(`バケット名: ${BUCKET_NAME}`);
    console.log(`オブジェクトキー: ${OBJECT_KEY}`);
    console.log(`保存先: ${DOWNLOAD_PATH}`);
    console.log(`ContentType: ${response.ContentType ?? "不明"}`);
    console.log(`ContentLength: ${response.ContentLength ?? "不明"} bytes`);
    console.log(`ETag: ${response.ETag ?? "不明"}`);
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
        } else if (error.name === "NoSuchKey") {
            console.error("指定されたオブジェクトが存在しません。");
        }
        
        console.error("スタックトレース:", error.stack);
    } else {
        console.error("✗ 予期しないエラーが発生しました:", error);
    }
    throw error;
}

// 実行
getObject();
