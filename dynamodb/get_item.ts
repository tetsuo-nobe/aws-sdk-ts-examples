import {
    DynamoDBClient,
    GetItemCommand,
    GetItemCommandOutput
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { TABLE_NAME, DEFAULT_REGION } from "./config";

/**
 * 1. 結果整合性でアイテムを取得する（デフォルト）
 * @param client - DynamoDBクライアント
 * @returns Promise<GetItemCommandOutput>
 */
async function getItemEventualConsistency(
    client: DynamoDBClient
): Promise<GetItemCommandOutput> {
    console.log("1. 結果整合性でのGet Item");
    console.log("==================");

    const command = new GetItemCommand({
        TableName: TABLE_NAME,
        Key: marshall({
            user_id: "3",
            game_id: "G001"
        }),
        // ConsistentReadを指定しない、またはfalseにすると結果整合性
        ConsistentRead: false
    });

    const response = await client.send(command);
    
    if (response.Item) {
        const item = unmarshall(response.Item);
        console.log("✓ アイテム取得成功:");
        console.log(JSON.stringify(item, null, 2));
    } else {
        console.log("✗ アイテムが見つかりませんでした");
    }
    console.log("");

    return response;
}

/**
 * 2. 強力な整合性でアイテムを取得する
 * @param client - DynamoDBクライアント
 * @returns Promise<GetItemCommandOutput>
 */
async function getItemStrongConsistency(
    client: DynamoDBClient
): Promise<GetItemCommandOutput> {
    console.log("2. 強力な整合性でのGet Item");
    console.log("==================");

    const command = new GetItemCommand({
        TableName: TABLE_NAME,
        Key: marshall({
            user_id: "3",
            game_id: "G001"
        }),
        // ConsistentReadをtrueにすると強力な整合性
        ConsistentRead: true
    });

    const response = await client.send(command);
    
    if (response.Item) {
        const item = unmarshall(response.Item);
        console.log("✓ アイテム取得成功:");
        console.log(JSON.stringify(item, null, 2));
    } else {
        console.log("✗ アイテムが見つかりませんでした");
    }
    console.log("");

    return response;
}

/**
 * 3. 属性を限定してアイテムを取得する
 * @param client - DynamoDBクライアント
 * @returns Promise<GetItemCommandOutput>
 */
async function getItemWithProjection(
    client: DynamoDBClient
): Promise<GetItemCommandOutput> {
    console.log("3. 属性を限定してのGet Item（scoreとlifeのみ取得）");
    console.log("==================");

    const command = new GetItemCommand({
        TableName: TABLE_NAME,
        Key: marshall({
            user_id: "3",
            game_id: "G001"
        }),
        // ProjectionExpressionで取得する属性を限定
        ProjectionExpression: "score, life",
        ConsistentRead: true
    });

    const response = await client.send(command);
    
    if (response.Item) {
        const item = unmarshall(response.Item);
        console.log("✓ アイテム取得成功（限定された属性のみ）:");
        console.log(JSON.stringify(item, null, 2));
    } else {
        console.log("✗ アイテムが見つかりませんでした");
    }
    console.log("");

    return response;
}

/**
 * 全てのGet Item操作を実行する
 * @returns Promise<void>
 */
async function getAllItems(): Promise<void> {
    const region: string = process.env.AWS_REGION || DEFAULT_REGION;
    const client: DynamoDBClient = new DynamoDBClient({ region });

    try {
        console.log("user_id=3, game_id=G001 のアイテムを取得します");
        console.log("==================\n");

        // 1. 結果整合性でのGet Item
        await getItemEventualConsistency(client);

        // 2. 強力な整合性でのGet Item
        await getItemStrongConsistency(client);

        // 3. 属性を限定してのGet Item
        await getItemWithProjection(client);

        console.log("全ての取得操作が完了しました");
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
getAllItems();
