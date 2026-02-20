import { 
    S3Client, 
    PutObjectCommand, 
    PutObjectCommandOutput
} from "@aws-sdk/client-s3";
import { readFileSync } from "fs";
import { basename } from "path";
import { BUCKET_NAME, DEFAULT_REGION } from "./config";

// アップロードするファイルのパス
const FILE_PATH: string = "./s3/cat.jpg";

/**
 * S3バケットにオブジェクトをアップロードする
 * @returns Promise<void>
 */
async function putObject(): Promise<void> {
    const region: string = process.env.AWS_REGION || DEFAULT_REGION;
    
    // S3クライアントを作成
    const client: S3Client = new S3Client({ region });

    try {
        // ファイルを読み込む
        const fileContent: Buffer = readFileSync(FILE_PATH);
        const fileName: string = basename(FILE_PATH);

        // PutObjectコマンドを実行
        const command: PutObjectCommand = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: fileName,
            Body: fileContent,
            ContentType: "image/jpeg"
        });

        const response: PutObjectCommandOutput = await client.send(command);

        displaySuccess(fileName, response);
    } catch (error) {
        handleError(error);
    }
}

/**
 * アップロード成功時のメッセージを表示
 * @param fileName - アップロードしたファイル名
 * @param response - PutObjectコマンドのレスポンス
 */
function displaySuccess(fileName: string, response: PutObjectCommandOutput): void {
    console.log("✓ オブジェクトのアップロード成功!");
    console.log("============================");
    console.log(`バケット名: ${BUCKET_NAME}`);
    console.log(`ファイル名: ${fileName}`);
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
        } else if (error.message.includes("ENOENT")) {
            console.error("指定されたファイルが見つかりません。");
        }
        
        console.error("スタックトレース:", error.stack);
    } else {
        console.error("✗ 予期しないエラーが発生しました:", error);
    }
    throw error;
}

// 実行
putObject();
