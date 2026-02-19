import { S3Client, ListBucketsCommand, ListBucketsCommandOutput, Bucket } from "@aws-sdk/client-s3";

/**
 * S3バケットの一覧を取得して出力する
 * @returns Promise<void>
 */
async function listBuckets(): Promise<void> {
    // S3クライアントを作成（リージョンを指定）
    const client: S3Client = new S3Client({
        region: process.env.AWS_REGION || "ap-northeast-1" // 東京リージョン
    });

    try {
        // ListBucketsコマンドを実行
        const command: ListBucketsCommand = new ListBucketsCommand({});
        const response: ListBucketsCommandOutput = await client.send(command);

        // バケット一覧を出力
        displayBuckets(response.Buckets);
    } catch (error) {
        handleError(error);
    }
}

/**
 * バケット一覧を整形して表示
 * @param buckets - S3バケットの配列
 */
function displayBuckets(buckets: Bucket[] | undefined): void {
    console.log("S3バケット一覧:");
    console.log("================");
    
    if (buckets && buckets.length > 0) {
        buckets.forEach((bucket: Bucket, index: number) => {
            const name: string = bucket.Name ?? "名前なし";
            const creationDate: Date | undefined = bucket.CreationDate;
            console.log(`${index + 1}. ${name} (作成日: ${creationDate?.toISOString() ?? "不明"})`);
        });
        console.log(`\n合計: ${buckets.length}個のバケット`);
    } else {
        console.log("バケットが見つかりませんでした。");
    }
}

/**
 * エラーハンドリング
 * @param error - キャッチされたエラー
 */
function handleError(error: unknown): never {
    if (error instanceof Error) {
        console.error("エラーが発生しました:", error.message);
        console.error("スタックトレース:", error.stack);
    } else {
        console.error("予期しないエラーが発生しました:", error);
    }
    throw error;
}

// 実行
listBuckets();
