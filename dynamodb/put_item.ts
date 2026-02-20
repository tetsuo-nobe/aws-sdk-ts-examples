import {
    DynamoDBClient,
    PutItemCommand,
    PutItemCommandOutput
} from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { TABLE_NAME, DEFAULT_REGION } from "./config";
import * as fs from "fs";
import * as path from "path";

/**
 * スコアデータの型定義
 */
interface ScoreData {
    user_id: number;
    game_id: string;
    score: number;
    life: number;
}

/**
 * JSONファイルからスコアデータを読み込む
 * @returns スコアデータの配列
 */
function loadScoreData(): ScoreData[] {
    const filePath = path.join(__dirname, "score_data.json");
    const fileContent = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(fileContent) as ScoreData[];
}

/**
 * DynamoDBテーブルにアイテムを追加する
 * @param client - DynamoDBクライアント
 * @param item - 追加するアイテム
 * @returns Promise<PutItemCommandOutput>
 */
async function putItem(
    client: DynamoDBClient,
    item: ScoreData
): Promise<PutItemCommandOutput> {
    // user_idを文字列に変換してDynamoDBに格納
    const dynamoItem = {
        user_id: String(item.user_id),
        game_id: item.game_id,
        score: item.score,
        life: item.life
    };

    const command = new PutItemCommand({
        TableName: TABLE_NAME,
        Item: marshall(dynamoItem)
    });

    return await client.send(command);
}

/**
 * 全てのスコアデータをDynamoDBに追加する
 * @returns Promise<void>
 */
async function putAllItems(): Promise<void> {
    const region: string = process.env.AWS_REGION || DEFAULT_REGION;
    const client: DynamoDBClient = new DynamoDBClient({ region });

    try {
        // JSONファイルからデータを読み込む
        const scoreDataList: ScoreData[] = loadScoreData();
        console.log(`${scoreDataList.length}件のアイテムを追加します...`);
        console.log("==================");

        let successCount = 0;
        let failCount = 0;

        // 各アイテムを順次追加
        for (const item of scoreDataList) {
            try {
                await putItem(client, item);
                console.log(`✓ 追加成功: user_id=${item.user_id}, game_id=${item.game_id}`);
                successCount++;
            } catch (error) {
                console.error(`✗ 追加失敗: user_id=${item.user_id}, game_id=${item.game_id}`);
                if (error instanceof Error) {
                    console.error(`  エラー: ${error.message}`);
                }
                failCount++;
            }
        }

        console.log("==================");
        console.log(`完了: 成功=${successCount}件, 失敗=${failCount}件`);
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
        console.error("スタックトレース:", error.stack);
    } else {
        console.error("✗ 予期しないエラーが発生しました:", error);
    }
    throw error;
}

// 実行
putAllItems();
