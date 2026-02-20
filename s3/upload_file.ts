import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { createReadStream } from "fs";
import { basename } from "path";
import { BUCKET_NAME, DEFAULT_REGION } from "./config";

// アップロードするファイルのパス
const FILE_PATH: string = "./s3/Eiffel.jpg";

/**
 * Uploadクラスを使ってS3バケットにファイルをアップロードする
 * @returns Promise<void>
 */
async function uploadFile(): Promise<void> {
    const region: string = process.env.AWS_REGION || DEFAULT_REGION;
    
    // S3クライアントを作成
    const client: S3Client = new S3Client({ region });

    try {
        const fileName: string = basename(FILE_PATH);

        // Uploadクラスを使用してアップロード
        const upload = new Upload({
            client: client,
            params: {
                Bucket: BUCKET_NAME,
                Key: fileName,
                Body: createReadStream(FILE_PATH),
                ContentType: "image/jpeg"
            }
        });

        // 進捗状況を監視（オプション）
        upload.on("httpUploadProgress", (progress) => {
            if (progress.loaded && progress.total) {
                const percentage: number = Math.round((progress.loaded / progress.total) * 100);
                console.log(`アップロード中: ${percentage}%`);
            }
        });

        // アップロード完了を待つ
        const result = await upload.done();

        displaySuccess(fileName, result);
    } catch (error) {
        handleError(error);
    }
}

/**
 * アップロード成功時のメッセージを表示
 * @param fileName - アップロードしたファイル名
 * @param result - Uploadの結果
 */
function displaySuccess(fileName: string, result: any): void {
    console.log("\n✓ ファイルのアップロード成功!");
    console.log("============================");
    console.log(`バケット名: ${BUCKET_NAME}`);
    console.log(`ファイル名: ${fileName}`);
    console.log(`ETag: ${result.ETag ?? "不明"}`);
    console.log(`Location: ${result.Location ?? "不明"}`);
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
        } else if (error.message.includes("ENOENT")) {
            console.error("指定されたファイルが見つかりません。");
        }
        
        console.error("スタックトレース:", error.stack);
    } else {
        console.error("\n✗ 予期しないエラーが発生しました:", error);
    }
    throw error;
}

// 実行
uploadFile();
