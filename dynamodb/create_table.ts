import {
    DynamoDBClient,
    CreateTableCommand,
    CreateTableCommandOutput,
    KeyType,
    ScalarAttributeType,
    BillingMode
} from "@aws-sdk/client-dynamodb";
import { waitUntilTableExists } from "@aws-sdk/client-dynamodb";
import { TABLE_NAME, DEFAULT_REGION } from "./config";

/**
 * DynamoDBテーブルを作成する
 * @returns Promise<void>
 */
async function createTable(): Promise<void> {
    const region: string = process.env.AWS_REGION || DEFAULT_REGION;
    
    // DynamoDBクライアントを作成
    const client: DynamoDBClient = new DynamoDBClient({ region });

    try {
        // CreateTableコマンドを実行
        const command: CreateTableCommand = new CreateTableCommand({
            TableName: TABLE_NAME,
            // キースキーマの定義
            KeySchema: [
                {
                    AttributeName: "user_id",
                    KeyType: KeyType.HASH  // パーティションキー
                },
                {
                    AttributeName: "game_id",
                    KeyType: KeyType.RANGE  // ソートキー
                }
            ],
            // 属性定義
            AttributeDefinitions: [
                {
                    AttributeName: "user_id",
                    AttributeType: ScalarAttributeType.S  // String型
                },
                {
                    AttributeName: "game_id",
                    AttributeType: ScalarAttributeType.S  // String型
                }
            ],
            // プロビジョニングされたスループット
            BillingMode: BillingMode.PROVISIONED,
            ProvisionedThroughput: {
                ReadCapacityUnits: 1,
                WriteCapacityUnits: 1
            }
        });

        const response: CreateTableCommandOutput = await client.send(command);

        displaySuccess(response);

        // テーブルがACTIVEになるまで待機
        console.log("\nテーブルがACTIVEになるまで待機しています...");
        await waitUntilTableExists(
            { client, maxWaitTime: 300 }, // 最大5分待機
            { TableName: TABLE_NAME }
        );

        console.log("✓ テーブルがACTIVEになりました!");
        console.log("テーブルの作成が完了しました。");
    } catch (error) {
        handleError(error);
    }
}

/**
 * テーブル作成成功時のメッセージを表示
 * @param response - CreateTableコマンドのレスポンス
 */
function displaySuccess(response: CreateTableCommandOutput): void {
    console.log("✓ テーブル作成成功!");
    console.log("==================");
    console.log(`テーブル名: ${response.TableDescription?.TableName ?? "不明"}`);
    console.log(`テーブルARN: ${response.TableDescription?.TableArn ?? "不明"}`);
    console.log(`ステータス: ${response.TableDescription?.TableStatus ?? "不明"}`);
    console.log(`作成日時: ${response.TableDescription?.CreationDateTime ?? "不明"}`);
    console.log("\n注意: テーブルの作成は非同期で行われます。");
}

/**
 * エラーハンドリング
 * @param error - キャッチされたエラー
 */
function handleError(error: unknown): never {
    if (error instanceof Error) {
        console.error("✗ エラーが発生しました:", error.message);
        
        // AWS SDKの一般的なエラーをチェック
        if (error.name === "ResourceInUseException") {
            console.error("このテーブル名は既に使用されています。");
        } else if (error.name === "LimitExceededException") {
            console.error("テーブル数の上限に達しています。");
        }
        
        console.error("スタックトレース:", error.stack);
    } else {
        console.error("✗ 予期しないエラーが発生しました:", error);
    }
    throw error;
}

// 実行
createTable();
