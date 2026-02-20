import {
    SQSClient,
    SendMessageBatchCommand,
    SendMessageBatchCommandOutput,
    SendMessageBatchRequestEntry,
    GetQueueUrlCommand
} from "@aws-sdk/client-sqs";
import { QUEUE_NAME, DEFAULT_REGION } from "./config";
import { OrderInfo } from "./types";
import * as fs from "fs";
import * as path from "path";

/**
 * JSONファイルから注文データを読み込む
 * @returns 注文データの配列
 */
function loadOrderData(): OrderInfo[] {
    const filePath = path.join(__dirname, "order_data.json");
    const fileContent = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(fileContent) as OrderInfo[];
}

/**
 * キューURLを取得する
 * @param client - SQSクライアント
 * @returns Promise<string>
 */
async function getQueueUrl(client: SQSClient): Promise<string> {
    const command = new GetQueueUrlCommand({
        QueueName: QUEUE_NAME
    });
    const response = await client.send(command);
    return response.QueueUrl!;
}

/**
 * 注文データをバッチエントリに変換する
 * @param orders - 注文データの配列
 * @returns バッチエントリの配列
 */
function createBatchEntries(orders: OrderInfo[]): SendMessageBatchRequestEntry[] {
    return orders.map((order, index) => ({
        Id: `msg-${index}`, // バッチ内で一意のID
        MessageBody: JSON.stringify(order, null, 2),
        MessageAttributes: {
            "OrderType": {
                DataType: "String",
                StringValue: "Standard"
            },
            "Priority": {
                DataType: "Number",
                StringValue: "1"
            },
            "OrderId": {
                DataType: "String",
                StringValue: order.orderId
            }
        }
    }));
}

/**
 * SQSキューにメッセージをバッチ送信する
 * @param client - SQSクライアント
 * @param queueUrl - キューURL
 * @param entries - バッチエントリの配列
 * @returns Promise<SendMessageBatchCommandOutput>
 */
async function sendMessageBatch(
    client: SQSClient,
    queueUrl: string,
    entries: SendMessageBatchRequestEntry[]
): Promise<SendMessageBatchCommandOutput> {
    const command = new SendMessageBatchCommand({
        QueueUrl: queueUrl,
        Entries: entries
    });

    return await client.send(command);
}

/**
 * 配列を指定サイズのチャンクに分割する
 * @param array - 分割する配列
 * @param chunkSize - チャンクサイズ
 * @returns チャンクの配列
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
}

/**
 * バッチ送信結果を表示する
 * @param batchNumber - バッチ番号
 * @param response - SendMessageBatchコマンドのレスポンス
 * @param entries - 送信したエントリ
 */
function displayBatchResult(
    batchNumber: number,
    response: SendMessageBatchCommandOutput,
    entries: SendMessageBatchRequestEntry[]
): void {
    console.log(`\n[バッチ ${batchNumber}] 送信結果:`);
    console.log(`  送信件数: ${entries.length}件`);
    
    if (response.Successful && response.Successful.length > 0) {
        console.log(`  ✓ 成功: ${response.Successful.length}件`);
        response.Successful.forEach((success) => {
            const entry = entries.find(e => e.Id === success.Id);
            if (entry) {
                const order: OrderInfo = JSON.parse(entry.MessageBody!);
                console.log(`    - ${order.orderId} (メッセージID: ${success.MessageId})`);
            }
        });
    }
    
    if (response.Failed && response.Failed.length > 0) {
        console.log(`  ✗ 失敗: ${response.Failed.length}件`);
        response.Failed.forEach((failure) => {
            const entry = entries.find(e => e.Id === failure.Id);
            if (entry) {
                const order: OrderInfo = JSON.parse(entry.MessageBody!);
                console.log(`    - ${order.orderId}: ${failure.Message} (コード: ${failure.Code})`);
            }
        });
    }
}

/**
 * バッチメッセージ送信を実行する
 * @returns Promise<void>
 */
async function executeSendMessageBatch(): Promise<void> {
    const region: string = process.env.AWS_REGION || DEFAULT_REGION;
    const client: SQSClient = new SQSClient({ region });

    try {
        console.log(`キュー "${QUEUE_NAME}" にメッセージをバッチ送信します`);
        console.log("==================");

        // キューURLを取得
        const queueUrl = await getQueueUrl(client);
        console.log(`キューURL: ${queueUrl}\n`);

        // JSONファイルから注文データを読み込む
        const orderDataList = loadOrderData();
        console.log(`${orderDataList.length}件の注文データを送信します`);
        console.log(`バッチサイズ: 最大10件/バッチ\n`);
        console.log("==================");

        // 10件ごとにチャンク分割
        const orderChunks = chunkArray(orderDataList, 10);
        console.log(`バッチ数: ${orderChunks.length}個\n`);

        let totalSuccess = 0;
        let totalFailed = 0;

        // 各チャンクをバッチ送信
        for (const [index, chunk] of orderChunks.entries()) {
            const entries = createBatchEntries(chunk);
            const response = await sendMessageBatch(client, queueUrl, entries);
            
            displayBatchResult(index + 1, response, entries);
            
            totalSuccess += response.Successful?.length ?? 0;
            totalFailed += response.Failed?.length ?? 0;
        }

        console.log("\n==================");
        console.log(`全体の送信完了: 成功=${totalSuccess}件, 失敗=${totalFailed}件`);
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
        
        if (error.name === "QueueDoesNotExist") {
            console.error("キューが存在しません。先にキューを作成してください。");
        } else if (error.name === "InvalidMessageContents") {
            console.error("メッセージの内容が無効です。");
        } else if (error.name === "TooManyEntriesInBatchRequest") {
            console.error("バッチリクエストのエントリ数が多すぎます（最大10件）。");
        } else if (error.name === "BatchEntryIdsNotDistinct") {
            console.error("バッチエントリのIDが重複しています。");
        }
        
        console.error("スタックトレース:", error.stack);
    } else {
        console.error("✗ 予期しないエラーが発生しました:", error);
    }
    throw error;
}

// 実行
executeSendMessageBatch();
