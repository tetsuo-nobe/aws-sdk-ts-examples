import {
    DynamoDBClient,
    ScanCommand,
    ScanCommandOutput
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { TABLE_NAME, DEFAULT_REGION } from "./config";

/**
 * lifeが1以上のアイテムをスキャンする
 * @param client - DynamoDBクライアント
 * @returns Promise<ScanCommandOutput>
 */
async function scanItemsByLife(
    client: DynamoDBClient
): Promise<ScanCommandOutput> {
    console.log("Scan API を使用してアイテムを取得します");
    console.log("条件: life >= 3");
    console.log("==================");

    const command = new ScanCommand({
        TableName: TABLE_NAME,
        // フィルター条件式
        FilterExpression: "life >= :minLife",
        // 式で使用する値
        ExpressionAttributeValues: marshall({
            ":minLife": 3
        })
    });

    return await client.send(command);
}

/**
 * スキャン結果を表示する
 * @param response - Scanコマンドのレスポンス
 */
function displayResults(response: ScanCommandOutput): void {
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
 * Scan操作を実行する
 * @returns Promise<void>
 */
async function executeScan(): Promise<void> {
    const region: string = process.env.AWS_REGION || DEFAULT_REGION;
    const client: DynamoDBClient = new DynamoDBClient({ region });

    try {
        const response = await scanItemsByLife(client);
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
executeScan();
