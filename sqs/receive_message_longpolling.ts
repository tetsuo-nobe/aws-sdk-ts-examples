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
 * @returns Promise<void>
 */
async function displayAndDeleteMessages(
    client: SQSClient,
    queueUrl: string,
    messages: Message[]
): Promise<void> {
    if (messages.length === 0) {
        console.log("✗ メッセージが見つかりませんでした");
        return;
    }

    console.log(`✓ ${messages.length}件のメッセージを受信しました\n`);
    console.log("==================");

    let successCount = 0;
    let failCount = 0;

    for (const [index, message] of messages.entries()) {
        console.log(`\n[メッセージ ${index + 1}]`);
        console.log(`メッセージID: ${message.MessageId ?? "不明"}`);
        console.log(`受信ハンドル: ${message.ReceiptHandle?.substring(0, 50)}...`);
        
        let processSuccess = false;

        try {
            // メッセージ属性を表示
            if (message.MessageAttributes) {
                console.log("\nメッセージ属性:");
                for (const [key, value] of Object.entries(message.MessageAttributes)) {
                    console.log(`  ${key}: ${value.StringValue ?? value.BinaryValue ?? "不明"} (${value.DataType})`);
                }
            }

            // メッセージ本文を表示
            if (message.Body) {
                const orderInfo: OrderInfo = JSON.parse(message.Body);
                console.log("\n注文情報:");
                console.log(JSON.stringify(orderInfo, null, 2));
                processSuccess = true;
            }

            console.log("\n==================");

            // 正常に処理できた場合はメッセージを削除
            if (processSuccess && message.ReceiptHandle) {
                await deleteMessage(client, queueUrl, message.ReceiptHandle);
                console.log(`✓ メッセージ ${index + 1} を削除しました`);
                successCount++;
            }
        } catch (error) {
            console.log("\n✗ メッセージの処理に失敗しました");
            if (error instanceof Error) {
                console.log(`エラー: ${error.message}`);
            }
            if (message.Body) {
                console.log("メッセージ本文（生データ）:");
                console.log(message.Body);
            }
            console.log("このメッセージは削除されず、キューに残ります。");
            console.log("\n==================");
            failCount++;
        }
    }

    console.log(`\n処理結果: 成功=${successCount}件, 失敗=${failCount}件`);
}

/**
 * メッセージ受信を実行する
 * @returns Promise<void>
 */
async function executeReceiveMessage(): Promise<void> {
    const region: string = process.env.AWS_REGION || DEFAULT_REGION;
    const client: SQSClient = new SQSClient({ region });

    try {
        console.log(`キュー "${QUEUE_NAME}" からメッセージを受信します`);
        console.log("ポーリング方式: ロングポーリング（WaitTimeSeconds=20）");
        console.log("==================\n");

        // キューURLを取得
        const queueUrl = await getQueueUrl(client);
        console.log(`キューURL: ${queueUrl}\n`);

        console.log("メッセージを待機しています（最大20秒）...\n");

        // メッセージを受信
        const response = await receiveMessage(client, queueUrl);

        // メッセージを表示し、正常に処理できた場合は削除
        if (response.Messages) {
            await displayAndDeleteMessages(client, queueUrl, response.Messages);
        } else {
            console.log("✗ メッセージが見つかりませんでした（20秒間待機しました）");
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
executeReceiveMessage();
