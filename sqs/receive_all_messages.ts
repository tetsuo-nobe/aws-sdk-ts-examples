import {
    SQSClient,
    ReceiveMessageCommand,
    ReceiveMessageCommandOutput,
    DeleteMessageCommand,
    GetQueueUrlCommand,
    Message
} from "@aws-sdk/client-sqs";
import { QUEUE_NAME, DEFAULT_REGION } from "./config";
import { OrderInfo } from "./types";

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
 * SQSキューからメッセージを受信する（ロングポーリング）
 * @param client - SQSクライアント
 * @param queueUrl - キューURL
 * @returns Promise<ReceiveMessageCommandOutput>
 */
async function receiveMessage(
    client: SQSClient,
    queueUrl: string
): Promise<ReceiveMessageCommandOutput> {
    const command = new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 10, // 一度に受信する最大メッセージ数（1-10）
        MessageAttributeNames: ["All"], // 全てのメッセージ属性を取得
        WaitTimeSeconds: 20 // ロングポーリング（20秒待機）
    });

    return await client.send(command);
}

/**
 * メッセージを削除する
 * @param client - SQSクライアント
 * @param queueUrl - キューURL
 * @param receiptHandle - 受信ハンドル
 * @returns Promise<void>
 */
async function deleteMessage(
    client: SQSClient,
    queueUrl: string,
    receiptHandle: string
): Promise<void> {
    const command = new DeleteMessageCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: receiptHandle
    });

    await client.send(command);
}

/**
 * 受信したメッセージを表示し、正常に処理できた場合は削除する
 * @param client - SQSクライアント
 * @param queueUrl - キューURL
 * @param messages - 受信したメッセージの配列
 * @param batchNumber - バッチ番号
 * @returns Promise<{success: number, failed: number}>
 */
async function displayAndDeleteMessages(
    client: SQSClient,
    queueUrl: string,
    messages: Message[],
    batchNumber: number
): Promise<{success: number, failed: number}> {
    console.log(`\n[バッチ ${batchNumber}] ${messages.length}件のメッセージを受信しました`);
    console.log("==================");

    let successCount = 0;
    let failCount = 0;

    for (const [index, message] of messages.entries()) {
        console.log(`\n[メッセージ ${index + 1}]`);
        console.log(`メッセージID: ${message.MessageId ?? "不明"}`);
        
        let processSuccess = false;

        try {
            // メッセージ属性を表示
            if (message.MessageAttributes) {
                console.log("メッセージ属性:");
                for (const [key, value] of Object.entries(message.MessageAttributes)) {
                    console.log(`  ${key}: ${value.StringValue ?? value.BinaryValue ?? "不明"}`);
                }
            }

            // メッセージ本文を表示
            if (message.Body) {
                const orderInfo: OrderInfo = JSON.parse(message.Body);
                console.log(`注文ID: ${orderInfo.orderId}`);
                console.log(`顧客: ${orderInfo.customerName}`);
                console.log(`合計金額: ¥${orderInfo.totalAmount.toLocaleString()}`);
                processSuccess = true;
            }

            // 正常に処理できた場合はメッセージを削除
            if (processSuccess && message.ReceiptHandle) {
                await deleteMessage(client, queueUrl, message.ReceiptHandle);
                console.log(`✓ メッセージを削除しました`);
                successCount++;
            }
        } catch (error) {
            console.log("✗ メッセージの処理に失敗しました");
            if (error instanceof Error) {
                console.log(`エラー: ${error.message}`);
            }
            console.log("このメッセージは削除されず、キューに残ります。");
            failCount++;
        }
    }

    return { success: successCount, failed: failCount };
}

/**
 * キューが空になるまでメッセージを受信し続ける
 * @returns Promise<void>
 */
async function receiveAllMessages(): Promise<void> {
    const region: string = process.env.AWS_REGION || DEFAULT_REGION;
    const client: SQSClient = new SQSClient({ region });

    try {
        console.log(`キュー "${QUEUE_NAME}" から全てのメッセージを受信します`);
        console.log("ポーリング方式: ロングポーリング（WaitTimeSeconds=20）");
        console.log("==================\n");

        // キューURLを取得
        const queueUrl = await getQueueUrl(client);
        console.log(`キューURL: ${queueUrl}\n`);

        let batchNumber = 0;
        let totalSuccess = 0;
        let totalFailed = 0;
        let hasMoreMessages = true;

        console.log("メッセージの受信を開始します...\n");

        // キューが空になるまでループ
        while (hasMoreMessages) {
            batchNumber++;
            console.log(`\n--- バッチ ${batchNumber} の受信を試行中... ---`);

            // メッセージを受信
            const response = await receiveMessage(client, queueUrl);

            // メッセージが存在する場合は処理
            if (response.Messages && response.Messages.length > 0) {
                const result = await displayAndDeleteMessages(
                    client,
                    queueUrl,
                    response.Messages,
                    batchNumber
                );
                
                totalSuccess += result.success;
                totalFailed += result.failed;

                console.log(`\nバッチ ${batchNumber} 完了: 成功=${result.success}件, 失敗=${result.failed}件`);
            } else {
                // メッセージがない場合はループを終了
                console.log("✓ キューにメッセージがありません（20秒間待機しました）");
                hasMoreMessages = false;
            }
        }

        console.log("\n==================");
        console.log("全メッセージの受信完了");
        console.log(`総バッチ数: ${batchNumber - 1}回`);
        console.log(`総処理件数: 成功=${totalSuccess}件, 失敗=${totalFailed}件`);
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
        } else if (error.name === "OverLimit") {
            console.error("リクエストの制限を超えました。");
        }
        
        console.error("スタックトレース:", error.stack);
    } else {
        console.error("✗ 予期しないエラーが発生しました:", error);
    }
    throw error;
}

// 実行
receiveAllMessages();
