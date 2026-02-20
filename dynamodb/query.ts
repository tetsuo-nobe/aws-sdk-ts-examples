import {
    DynamoDBClient,
    QueryCommand,
    QueryCommandOutput
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { TABLE_NAME, DEFAULT_REGION } from "./config";

/**
 * user_idを指定してアイテムをクエリする
 * @param client - DynamoDBクライアント
 * @param userId - 検索するuser_id
 * @returns Promise<QueryCommandOutput>
 */
async function queryByUserId(
    client: DynamoDBClient,
    userId: string
): Promise<QueryCommandOutput> {
    console.log(`user_id = ${userId} のアイテムをクエリします`);
    console.log("==================");

    const command = new QueryCommand({
        TableName: TABLE_NAME,
        // パーティションキーの条件式
        KeyConditionExpression: "user_id = :userId",
        // 式で使用する値
        ExpressionAttributeValues: marshall({
            ":userId": userId
        })
    });

    return await client.send(command);
}

/**
 * クエリ結果を表示する
 * @param response - Queryコマンドのレスポンス
 */
function displayResults(response: QueryCommandOutput): void {
    if (response.Items && response.Items.length > 0) {
        console.log(`✓ ${response.Items.length}件のアイテムが見つかりました:\n`);
        
        response.Items.forEach((item, index) => {
            const unmarshalled = unmarshall(item);
            console.log(`[${index + 1}]`);
            console.log(JSON.stringify(unmarshalled, null, 2));
        });

        console.log("\n==================");
        console.log(`取得件数: ${response.Count}`);
        console.log(`スキャン件数: ${response.ScannedCount}`);
        
        if (response.LastEvaluatedKey) {
            console.log("注意: さらに結果があります（ページネーションが必要）");
        }
    } else {
        console.log("✗ アイテムが見つかりませんでした");
    }
}

/**
 * Query操作を実行する
 * @returns Promise<void>
 */
async function executeQuery(): Promise<void> {
    const region: string = process.env.AWS_REGION || DEFAULT_REGION;
    const client: DynamoDBClient = new DynamoDBClient({ region });

    // クエリするuser_id（例: "3"）
    const userId = "3";

    try {
        const response = await queryByUserId(client, userId);
        displayResults(response);
    } catch (error) {
        handleError(error);
    }
}

/**
 * エラーハンドリング
 * @param error - キャッチされたエラー
 */
function handleError(error: unknown): never {
    if (error instanceof Error) {
        console.error("✗ エラーが発生しました:", error.message);
        
        if (error.name === "ResourceNotFoundException") {
            console.error("テーブルが見つかりません。");
        } else if (error.name === "ValidationException") {
            console.error("リクエストの検証に失敗しました。");
        }
        
        console.error("スタックトレース:", error.stack);
    } else {
        console.error("✗ 予期しないエラーが発生しました:", error);
    }
    throw error;
}

// 実行
executeQuery();
