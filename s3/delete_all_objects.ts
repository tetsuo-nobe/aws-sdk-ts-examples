import { 
    S3Client, 
    ListObjectsV2Command,
    ListObjectsV2CommandOutput,
    DeleteObjectsCommand,
    DeleteObjectsCommandOutput,
    _Object
} from "@aws-sdk/client-s3";
import { BUCKET_NAME, DEFAULT_REGION } from "./config";

/**
 * バケット内のすべてのオブジェクトを削除する
 * @returns Promise<void>
 */
async function deleteAllObjects(): Promise<void> {
    const region: string = process.env.AWS_REGION || DEFAULT_REGION;
    
    // S3クライアントを作成
    const client: S3Client = new S3Client({ region });

    try {
        console.log(`バケット "${BUCKET_NAME}" 内のオブジェクトを取得中...\n`);
        
        // バケット内のすべてのオブジェクトを取得
        const objects: _Object[] = await listAllObjects(client);
        
        if (objects.length === 0) {
            console.log("✓ バケットは既に空です。");
            return;
        }

        console.log(`見つかったオブジェクト数: ${objects.length}`);
        displayObjects(objects);
        
        // すべてのオブジェクトを削除
        console.log("\nオブジェクトを削除中...");
        const deletedCount: number = await deleteObjects(client, objects);
        
        displaySuccess(deletedCount);
    } catch (error) {
        handleError(error);
    }
}

/**
 * バケット内のすべてのオブジェクトを取得
 * @param client - S3クライアント
 * @returns Promise<_Object[]> - オブジェクトの配列
 */
async function listAllObjects(client: S3Client): Promise<_Object[]> {
    const allObjects: _Object[] = [];
    let continuationToken: string | undefined = undefined;

    do {
        const command: ListObjectsV2Command = new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            ContinuationToken: continuationToken
        });

        const response: ListObjectsV2CommandOutput = await client.send(command);

        if (response.Contents) {
            allObjects.push(...response.Contents);
        }

        continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return allObjects;
}

/**
 * オブジェクトを一括削除
 * @param client - S3クライアント
 * @param objects - 削除するオブジェクトの配列
 * @returns Promise<number> - 削除されたオブジェクト数
 */
async function deleteObjects(client: S3Client, objects: _Object[]): Promise<number> {
    // S3のDeleteObjectsは一度に最大1000個まで削除可能
    const batchSize: number = 1000;
    let totalDeleted: number = 0;

    for (let i = 0; i < objects.length; i += batchSize) {
        const batch: _Object[] = objects.slice(i, i + batchSize);
        
        const command: DeleteObjectsCommand = new DeleteObjectsCommand({
            Bucket: BUCKET_NAME,
            Delete: {
                Objects: batch.map(obj => ({ Key: obj.Key! })),
                Quiet: false
            }
        });

        const response: DeleteObjectsCommandOutput = await client.send(command);
        
        if (response.Deleted) {
            totalDeleted += response.Deleted.length;
            console.log(`  削除完了: ${response.Deleted.length}個`);
        }

        if (response.Errors && response.Errors.length > 0) {
            console.error(`  エラー: ${response.Errors.length}個のオブジェクトで削除失敗`);
            response.Errors.forEach(err => {
                console.error(`    - ${err.Key}: ${err.Message}`);
            });
        }
    }

    return totalDeleted;
}

/**
 * オブジェクト一覧を表示
 * @param objects - オブジェクトの配列
 */
function displayObjects(objects: _Object[]): void {
    console.log("\n削除対象のオブジェクト:");
    console.log("====================");
    
    objects.forEach((obj: _Object, index: number) => {
        const size: number = obj.Size ?? 0;
        const sizeKB: string = (size / 1024).toFixed(2);
        console.log(`${index + 1}. ${obj.Key} (${sizeKB} KB)`);
    });
}

/**
 * 削除成功時のメッセージを表示
 * @param deletedCount - 削除されたオブジェクト数
 */
function displaySuccess(deletedCount: number): void {
    console.log("\n✓ すべてのオブジェクトの削除が完了しました!");
    console.log("=====================================");
    console.log(`バケット名: ${BUCKET_NAME}`);
    console.log(`削除されたオブジェクト数: ${deletedCount}個`);
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
        }
        
        console.error("スタックトレース:", error.stack);
    } else {
        console.error("\n✗ 予期しないエラーが発生しました:", error);
    }
    throw error;
}

// 実行
deleteAllObjects();
