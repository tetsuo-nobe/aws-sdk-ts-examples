import {
    DynamoDBClient,
    ExecuteStatementCommand,
    ExecuteStatementCommandOutput
} from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { TABLE_NAME, DEFAULT_REGION } from "./config";

/**
 * PartiQLを使用してuser_idでアイテムを取得する
 * @param client - DynamoDBクライアント
 * @param userId - 検索するuser_id
 * @returns Promise<ExecuteStatementCommandOutput>
 */
async function executePartiQL(
    client: DynamoDBClient,
    userId: string
): Promise<ExecuteStatementCommandOutput> {
    console.log("PartiQLを使用してクエリを実行します");
    console.log(`SQL: SELECT game_id, score, life FROM ${TABLE_NAME} WHERE user_id = '${userId}'`);
    console.log("==================");

    const statement = `SELECT game_id, score, life FROM ${TABLE_NAME} WHERE user_id = ?`;

    const command = new ExecuteStatementCommand({
        Statement: statement,
        Parameters: [{ S: userId }]
    });

    return await client.send(command);
}

/**
 * クエリ結果を表示する
 * @param response - ExecuteStatementコマンドのレスポンス
 */
function displayResults(response: ExecuteStatementCommandOutput): void {
    if (response.Items && response.Items.length > 0) {
        console.log(`✓ ${response.Items.length}件のアイテムが見つかりました:\n`);
        
        response.Items.forEach((item, index) => {
            const unmarshalled = unmarshall(item);
            console.log(`[${index + 1}]`);
            console.log(JSON.stringify(unmarshalled, null, 2));
        });

        console.log("\n==================");
        console.log(`取得件数: ${response.Items.length}`);
    } else {
        console.log("✗ アイテムが見つかりませんでした");
    }
}

/**
 * PartiQL操作を実行する
 * @returns Promise<void>
 */
async function executeQuery(): Promise<void> {
    const region: string = process.env.AWS_REGION || DEFAULT_REGION;
    const client: DynamoDBClient = new DynamoDBClient({ region });

    // クエリするuser_id（例: "3"）
    const userId = "3";

    try {
        const response = await executePartiQL(client, userId);
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
            console.error("PartiQLステートメントの検証に失敗しました。");
        }
        
        console.error("スタックトレース:", error.stack);
    } else {
        console.error("✗ 予期しないエラーが発生しました:", error);
    }
    throw error;
}

// 実行
executeQuery();
