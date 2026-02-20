import { 
    S3Client, 
    PutObjectCommand,
    GetObjectCommand
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { readFileSync } from "fs";
import { BUCKET_NAME, DEFAULT_REGION } from "./config";

// アップロードするファイルのパス
const FILE_PATH: string = "./s3/cherry.jpg";
const OBJECT_KEY: string = "cherry.jpg";
// URLの有効期限（秒）
const UPLOAD_EXPIRES_IN: number = 3600; // 1時間
const DOWNLOAD_EXPIRES_IN: number = 20; // 20秒

/**
 * 署名付きURLを使ってアップロードとダウンロードを行う
 * @returns Promise<void>
 */
async function generatePresignedUrl(): Promise<void> {
    const region: string = process.env.AWS_REGION || DEFAULT_REGION;
    
    // S3クライアントを作成
    const client: S3Client = new S3Client({ region });

    try {
        // ステップ1: アップロード用の署名付きURLを生成
        console.log("=== ステップ1: アップロード用署名付きURL生成 ===");
        const uploadUrl: string = await generateUploadUrl(client);
        console.log(`アップロード用URL: ${uploadUrl}`);
        console.log(`有効期限: ${UPLOAD_EXPIRES_IN}秒 (${UPLOAD_EXPIRES_IN / 60}分)\n`);

        // ステップ2: 署名付きURLを使ってファイルをアップロード
        console.log("=== ステップ2: 署名付きURLでアップロード実行 ===");
        await uploadFileWithPresignedUrl(uploadUrl);
        console.log("✓ アップロード成功!\n");

        // 少し待機（S3の整合性のため）
        await sleep(1000);

        // ステップ3: ダウンロード用の署名付きURLを生成
        console.log("=== ステップ3: ダウンロード用署名付きURL生成 ===");
        const downloadUrl: string = await generateDownloadUrl(client);
        console.log(`ダウンロード用URL: ${downloadUrl}`);
        console.log(`有効期限: ${DOWNLOAD_EXPIRES_IN}秒\n`);

        displaySummary(uploadUrl, downloadUrl);
    } catch (error) {
        handleError(error);
    }
}

/**
 * アップロード用の署名付きURLを生成
 * @param client - S3クライアント
 * @returns Promise<string> - 署名付きURL
 */
async function generateUploadUrl(client: S3Client): Promise<string> {
    const command: PutObjectCommand = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: OBJECT_KEY,
        ContentType: "image/jpeg"
    });

    return await getSignedUrl(client, command, { expiresIn: UPLOAD_EXPIRES_IN });
}

/**
 * 署名付きURLを使ってファイルをアップロード
 * @param url - 署名付きURL
 */
async function uploadFileWithPresignedUrl(url: string): Promise<void> {
    const fileContent: Buffer = readFileSync(FILE_PATH);

    const response = await fetch(url, {
        method: "PUT",
        body: fileContent,
        headers: {
            "Content-Type": "image/jpeg"
        }
    });

    if (!response.ok) {
        throw new Error(`アップロード失敗: ${response.status} ${response.statusText}`);
    }
}

/**
 * ダウンロード用の署名付きURLを生成
 * @param client - S3クライアント
 * @returns Promise<string> - 署名付きURL
 */
async function generateDownloadUrl(client: S3Client): Promise<string> {
    const command: GetObjectCommand = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: OBJECT_KEY
    });

    return await getSignedUrl(client, command, { expiresIn: DOWNLOAD_EXPIRES_IN });
}

/**
 * サマリーを表示
 * @param uploadUrl - アップロード用URL
 * @param downloadUrl - ダウンロード用URL
 */
function displaySummary(uploadUrl: string, downloadUrl: string): void {
    console.log("=== 完了サマリー ===");
    console.log(`バケット名: ${BUCKET_NAME}`);
    console.log(`オブジェクトキー: ${OBJECT_KEY}`);
    console.log(`ファイルパス: ${FILE_PATH}`);
    console.log("\n署名付きURLは以下のコマンドでテストできます:");
    console.log(`\nダウンロードテスト:`);
    console.log(`curl -o downloaded_cherry.jpg "${downloadUrl}"`);
}

/**
 * 指定時間待機
 * @param ms - ミリ秒
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * エラーハンドリング
 * @param error - キャッチされたエラー
 */
function handleError(error: unknown): never {
    if (error instanceof Error) {
        console.error("\n✗ エラーが発生しました:", error.message);
        
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
generatePresignedUrl();
