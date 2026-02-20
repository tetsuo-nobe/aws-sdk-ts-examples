import {
    DynamoDBClient,
    UpdateItemCommand,
    UpdateItemCommandOutput
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { TABLE_NAME, DEFAULT_REGION } from "./config";

/**
 * scoreが3000以上の場合にlifeを1増加させる
 * @param client - DynamoDBクライアント
 * @returns Promise<UpdateItemCommandOutput>
 */
async function updateItemConditionally(
    client: DynamoDBClient
): Promise<UpdateItemCommandOutput> {
    console.log("Update Item: user_id=3, game_id=G001");
    console.log("条件: scoreが3000以上の場合、lifeを1増加");
    console.log("==================");

    const command = new UpdateItemCommand({
        TableName: TABLE_NAME,
        Key: marshall({
            user_id: "3",
            game_id: "G001"
        }),
        // lifeを1増加させる更新式
        UpdateExpression: "SET life = life + :increment",
        // scoreが3000以上という条件
        ConditionExpression: "score >= :minScore",
        // 式で使用する値
        ExpressionAttributeValues: marshall({
            ":increment": 1,
            ":minScore": 3000
        }),
        // 更新後の値を返す
        ReturnValues: "ALL_NEW"
    });

    return await client.send(command);
}

/**
 * Update Item操作を実行する
 * @returns Promise<void>
 */
async function executeUpdate(): Promise<void> {
    const region: string = process.env.AWS_REGION || DEFAULT_REGION;
    const client: DynamoDBClient = new DynamoDBClient({ region });

    try {
        const response = await updateItemConditionally(client);

        if (response.Attributes) {
            const updatedItem = unmarshall(response.Attributes);
            console.log("✓ 更新成功!");
            console.log("更新後のアイテム:");
            console.log(JSON.stringify(updatedItem, null, 2));
        } else {
            console.log("✓ 更新は実行されましたが、戻り値がありません");
        }
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
        
        if (error.name === "ConditionalCheckFailedException") {
            console.error("条件チェックに失敗しました。");
            console.error("scoreが3000未満のため、更新は実行されませんでした。");
        } else if (error.name === "ResourceNotFoundException") {
            console.error("テーブルまたはアイテムが見つかりません。");
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
executeUpdate();
