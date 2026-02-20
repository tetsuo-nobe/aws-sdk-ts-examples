import {
    DynamoDBClient,
    QueryCommand,
    QueryCommandOutput
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { TABLE_NAME, GSI_NAME, DEFAULT_REGION } from "./config";

/**
 * GSIを使用してgame_idとscoreでクエリする
 * @param client - DynamoDBクライアント
 * @param gameId - 検索するgame_id
 * @param minScore - 最小スコア
 * @returns Promise<QueryCommandOutput>
 */
async function queryGSIByGameIdAndScore(
    client: DynamoDBClient,
    gameId: string,
    minScore: number
): Promise<QueryCommandOutput> {
    console.log(`GSI "${GSI_NAME}" を使用してクエリします`);
    console.log(`条件: game_id = ${gameId}, score >= ${minScore}`);
    console.log("==================");

    const command = new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: GSI_NAME,
        // パーティションキーとソートキーの条件式
        KeyConditionExpression: "game_id = :gameId AND score >= :minScore",
        // 式で使用する値
        ExpressionAttributeValues: marshall({
            ":gameId": gameId,
            ":minScore": minScore
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
        console.log("✗ 条件に一致するアイテムが見つかりませんでした");
    }
}

/**
 * GSI Query操作を実行する
 * @returns Promise<void>
 */
async function executeGSIQuery(): Promise<void> {
    const region: string = process.env.AWS_REGION || DEFAULT_REGION;
    const client: DynamoDBClient = new DynamoDBClient({ region });

    // クエリ条件
    const gameId = "G001";
    const minScore = 3000;

    try {
        const response = await queryGSIByGameIdAndScore(client, gameId, minScore);
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
            console.error("テーブルまたはインデックスが見つかりません。");
            console.error(`GSI "${GSI_NAME}" が存在し、ACTIVEであることを確認してください。`);
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
executeGSIQuery();
