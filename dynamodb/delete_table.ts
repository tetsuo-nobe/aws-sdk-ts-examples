import {
    DynamoDBClient,
    DeleteTableCommand,
    DeleteTableCommandOutput
} from "@aws-sdk/client-dynamodb";
import { waitUntilTableNotExists } from "@aws-sdk/client-dynamodb";
import { TABLE_NAME, DEFAULT_REGION } from "./config";

/**
 * DynamoDBテーブルを削除する
 * @returns Promise<void>
 */
async function deleteTable(): Promise<void> {
    const region: string = process.env.AWS_REGION || DEFAULT_REGION;
    
    // DynamoDBクライアントを作成
    const client: DynamoDBClient = new DynamoDBClient({ region });

    try {
        console.log(`テーブル ${TABLE_NAME} を削除します`);
        console.log("==================");

        // DeleteTableコマンドを実行
        const command: DeleteTableCommand = new DeleteTableCommand({
            TableName: TABLE_NAME
        });

        const response: DeleteTableCommandOutput = await client.send(command);

        displaySuccess(response);

        // テーブルが完全に削除されるまで待機
        console.log("\nテーブルが完全に削除されるまで待機しています...");
        await waitUntilTableNotExists(
            { client, maxWaitTime: 300 }, // 最大5分待機
            { TableName: TABLE_NAME }
        );

        console.log("✓ テーブルが完全に削除されました!");
        console.log("テーブルの削除が完了しました。");
    } catch (error) {
        handleError(error);
    }
}

/**
 * テーブル削除成功時のメッセージを表示
 * @param response - DeleteTableコマンドのレスポンス
 */
function displaySuccess(response: DeleteTableCommandOutput): void {
    console.log("✓ テーブル削除リクエスト成功!");
    console.log("==================");
    console.log(`テーブル名: ${response.TableDescription?.TableName ?? "不明"}`);
    console.log(`テーブルARN: ${response.TableDescription?.TableArn ?? "不明"}`);
    console.log(`ステータス: ${response.TableDescription?.TableStatus ?? "不明"}`);
    console.log("\n注意: テーブルの削除は非同期で行われます。");
}

/**
 * エラーハンドリング
 * @param error - キャッチされたエラー
 */
function handleError(error: unknown): never {
    if (error instanceof Error) {
        console.error("✗ エラーが発生しました:", error.message);
        
        // AWS SDKの一般的なエラーをチェック
        if (error.name === "ResourceNotFoundException") {
            console.error("テーブルが見つかりません。既に削除されている可能性があります。");
        } else if (error.name === "ResourceInUseException") {
            console.error("テーブルが現在使用中です。しばらく待ってから再試行してください。");
        } else if (error.name === "LimitExceededException") {
            console.error("削除操作の上限に達しています。");
        }
        
        console.error("スタックトレース:", error.stack);
    } else {
        console.error("✗ 予期しないエラーが発生しました:", error);
    }
    throw error;
}

// 実行
deleteTable();
