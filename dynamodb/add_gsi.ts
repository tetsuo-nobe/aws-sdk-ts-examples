import {
    DynamoDBClient,
    UpdateTableCommand,
    UpdateTableCommandOutput,
    DescribeTableCommand,
    DescribeTableCommandOutput,
    KeyType,
    ScalarAttributeType,
    ProjectionType
} from "@aws-sdk/client-dynamodb";
import { TABLE_NAME, GSI_NAME, DEFAULT_REGION } from "./config";

/**
 * テーブルの状態を取得する
 * @param client - DynamoDBクライアント
 * @returns Promise<DescribeTableCommandOutput>
 */
async function describeTable(
    client: DynamoDBClient
): Promise<DescribeTableCommandOutput> {
    const command = new DescribeTableCommand({
        TableName: TABLE_NAME
    });
    return await client.send(command);
}

/**
 * GSIのステータスを10秒ごとにチェックし、ACTIVEになるまで待機する
 * @param client - DynamoDBクライアント
 * @returns Promise<void>
 */
async function waitForGSIActive(client: DynamoDBClient): Promise<void> {
    console.log("\nGSIのステータスを監視します...");
    console.log("==================");

    let isActive = false;
    let checkCount = 0;

    while (!isActive) {
        checkCount++;
        
        // 10秒待機
        await new Promise(resolve => setTimeout(resolve, 10000));

        try {
            const response = await describeTable(client);
            const gsi = response.Table?.GlobalSecondaryIndexes?.find(
                index => index.IndexName === GSI_NAME
            );

            if (gsi) {
                const status = gsi.IndexStatus;
                console.log(`[チェック ${checkCount}] GSI "${GSI_NAME}" のステータス: ${status}`);

                if (status === "ACTIVE") {
                    isActive = true;
                    console.log("\n✓ GSIがACTIVEになりました!");
                } else if (status === "CREATING") {
                    console.log("  作成中... 10秒後に再チェックします");
                } else {
                    console.log(`  予期しないステータス: ${status}`);
                }
            } else {
                console.log(`[チェック ${checkCount}] GSIが見つかりません`);
            }
        } catch (error) {
            console.error("ステータスチェック中にエラーが発生しました:", error);
            throw error;
        }
    }
}

/**
 * GameScoresテーブルにグローバルセカンダリインデックスを追加する
 * @returns Promise<void>
 */
async function addGlobalSecondaryIndex(): Promise<void> {
    const region: string = process.env.AWS_REGION || DEFAULT_REGION;
    const client: DynamoDBClient = new DynamoDBClient({ region });

    try {
        console.log(`テーブル ${TABLE_NAME} にGSIを追加します`);
        console.log(`GSI名: ${GSI_NAME}`);
        console.log("==================");

        const command = new UpdateTableCommand({
            TableName: TABLE_NAME,
            // 新しい属性定義（scoreを追加）
            AttributeDefinitions: [
                {
                    AttributeName: "game_id",
                    AttributeType: ScalarAttributeType.S
                },
                {
                    AttributeName: "score",
                    AttributeType: ScalarAttributeType.N
                }
            ],
            // GSIの作成
            GlobalSecondaryIndexUpdates: [
                {
                    Create: {
                        IndexName: GSI_NAME,
                        KeySchema: [
                            {
                                AttributeName: "game_id",
                                KeyType: KeyType.HASH  // パーティションキー
                            },
                            {
                                AttributeName: "score",
                                KeyType: KeyType.RANGE  // ソートキー
                            }
                        ],
                        Projection: {
                            ProjectionType: ProjectionType.ALL  // 全ての属性を含める
                        },
                        ProvisionedThroughput: {
                            ReadCapacityUnits: 1,
                            WriteCapacityUnits: 1
                        }
                    }
                }
            ]
        });

        const response: UpdateTableCommandOutput = await client.send(command);

        displaySuccess(response);

        // GSIがACTIVEになるまで待機
        await waitForGSIActive(client);

        console.log("\nGSIの作成が完了しました!");
    } catch (error) {
        handleError(error);
    }
}

/**
 * GSI追加成功時のメッセージを表示
 * @param response - UpdateTableコマンドのレスポンス
 */
function displaySuccess(response: UpdateTableCommandOutput): void {
    console.log("✓ GSI追加リクエスト成功!");
    console.log("==================");
    console.log(`テーブル名: ${response.TableDescription?.TableName ?? "不明"}`);
    console.log(`テーブルステータス: ${response.TableDescription?.TableStatus ?? "不明"}`);
    
    if (response.TableDescription?.GlobalSecondaryIndexes) {
        console.log("\nグローバルセカンダリインデックス:");
        response.TableDescription.GlobalSecondaryIndexes.forEach((gsi) => {
            console.log(`  - ${gsi.IndexName}: ${gsi.IndexStatus}`);
        });
    }
}

/**
 * エラーハンドリング
 * @param error - キャッチされたエラー
 */
function handleError(error: unknown): never {
    if (error instanceof Error) {
        console.error("✗ エラーが発生しました:", error.message);
        
        if (error.name === "ResourceInUseException") {
            console.error("テーブルが現在更新中です。しばらく待ってから再試行してください。");
        } else if (error.name === "ResourceNotFoundException") {
            console.error("テーブルが見つかりません。");
        } else if (error.name === "LimitExceededException") {
            console.error("GSIの数が上限に達しています。");
        } else if (error.name === "ValidationException") {
            console.error("リクエストの検証に失敗しました。GSIが既に存在する可能性があります。");
        }
        
        console.error("スタックトレース:", error.stack);
    } else {
        console.error("✗ 予期しないエラーが発生しました:", error);
    }
    throw error;
}

// 実行
addGlobalSecondaryIndex();
