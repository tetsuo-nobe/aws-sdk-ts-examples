import {
    DynamoDBClient,
    DeleteItemCommand,
    DeleteItemCommandOutput
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { TABLE_NAME, DEFAULT_REGION } from "./config";

/**
 * 指定したキーのアイテムを削除する
 * @param client - DynamoDBクライアント
 * @param userId - 削除するアイテムのuser_id
 * @param gameId - 削除するアイテムのgame_id
 * @returns Promise<DeleteItemCommandOutput>
 */
async function deleteItem(
    client: DynamoDBClient,
    userId: string,
    gameId: string
): Promise<DeleteItemCommandOutput> {
    console.log(`アイテムを削除します: user_id=${userId}, game_id=${gameId}`);
    console.log("==================");

    const command = new DeleteItemCommand({
        TableName: TABLE_NAME,
        Key: marshall({
            user_id: userId,
            game_id: gameId
        }),
        // 削除前の値を返す
        ReturnValues: "ALL_OLD"
    });

    return await client.send(command);
}

/**
 * 削除結果を表示する
 * @param response - DeleteItemコマンドのレスポンス
 */
function displayResult(response: DeleteItemCommandOutput): void {
    if (response.Attributes) {
        const deletedItem = unmarshall(response.Attributes);
        console.log("✓ アイテム削除成功!");
        console.log("削除されたアイテム:");
        console.log(JSON.stringify(deletedItem, null, 2));
    } else {
        console.log("✓ 削除は実行されましたが、該当するアイテムが存在しませんでした");
    }
}

/**
 * Delete Item操作を実行する
 * @returns Promise<void>
 */
async function executeDelete(): Promise<void> {
    const region: string = process.env.AWS_REGION || DEFAULT_REGION;
    const client: DynamoDBClient = new DynamoDBClient({ region });

    // 削除するアイテムのキー
    const userId = "3";
    const gameId = "G001";

    try {
        const response = await deleteItem(client, userId, gameId);
        displayResult(response);
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
        } else if (error.name === "ConditionalCheckFailedException") {
            console.error("条件チェックに失敗しました。");
        }
        
        console.error("スタックトレース:", error.stack);
    } else {
        console.error("✗ 予期しないエラーが発生しました:", error);
    }
    throw error;
}

// 実行
executeDelete();
