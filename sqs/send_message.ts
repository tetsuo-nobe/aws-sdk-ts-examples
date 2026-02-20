import {
    SQSClient,
    SendMessageCommand,
    SendMessageCommandOutput,
    GetQueueUrlCommand
} from "@aws-sdk/client-sqs";
import { QUEUE_NAME, DEFAULT_REGION } from "./config";
import { OrderInfo } from "./types";

/**
 * ダミーの注文情報を生成する
 * @returns 注文情報オブジェクト
 */
function createDummyOrder(): OrderInfo {
    return {
        orderId: "ORD-20260220-001",
        customerId: "CUST-12345",
        customerName: "山田太郎",
        items: [
            {
                productId: "PROD-001",
                productName: "ノートパソコン",
                quantity: 1,
                price: 120000
            },
            {
                productId: "PROD-002",
                productName: "ワイヤレスマウス",
                quantity: 2,
                price: 3000
            }
        ],
        totalAmount: 126000,
        orderDate: "2026-02-20T10:30:00Z",
        shippingAddress: {
            postalCode: "100-0001",
            prefecture: "東京都",
            city: "千代田区",
            address: "千代田1-1-1"
        }
    };
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
 * SQSキューにメッセージを送信する
 * @param client - SQSクライアント
 * @param queueUrl - キューURL
 * @param orderInfo - 注文情報
 * @returns Promise<SendMessageCommandOutput>
 */
async function sendMessage(
    client: SQSClient,
    queueUrl: string,
    orderInfo: OrderInfo
): Promise<SendMessageCommandOutput> {
    const command = new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(orderInfo, null, 2),
        // メッセージ属性（オプション）
        MessageAttributes: {
            "OrderType": {
                DataType: "String",
                StringValue: "Standard"
            },
            "Priority": {
                DataType: "Number",
                StringValue: "1"
            }
        }
    });

    return await client.send(command);
}

/**
 * メッセージ送信を実行する
 * @returns Promise<void>
 */
async function executeSendMessage(): Promise<void> {
    const region: string = process.env.AWS_REGION || DEFAULT_REGION;
    const client: SQSClient = new SQSClient({ region });

    try {
        console.log(`キュー "${QUEUE_NAME}" にメッセージを送信します`);
        console.log("==================");

        // キューURLを取得
        const queueUrl = await getQueueUrl(client);
        console.log(`キューURL: ${queueUrl}\n`);

        // ダミーの注文情報を生成
        const orderInfo = createDummyOrder();
        console.log("送信する注文情報:");
        console.log(JSON.stringify(orderInfo, null, 2));
        console.log("\n==================");

        // メッセージを送信
        const response = await sendMessage(client, queueUrl, orderInfo);

        displaySuccess(response);
    } catch (error) {
        handleError(error);
    }
}

/**
 * メッセージ送信成功時のメッセージを表示
 * @param response - SendMessageコマンドのレスポンス
 */
function displaySuccess(response: SendMessageCommandOutput): void {
    console.log("✓ メッセージ送信成功!");
    console.log("==================");
    console.log(`メッセージID: ${response.MessageId ?? "不明"}`);
    console.log(`MD5 of Body: ${response.MD5OfMessageBody ?? "不明"}`);
    
    if (response.MD5OfMessageAttributes) {
        console.log(`MD5 of Attributes: ${response.MD5OfMessageAttributes}`);
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
        }
        
        console.error("スタックトレース:", error.stack);
    } else {
        console.error("✗ 予期しないエラーが発生しました:", error);
    }
    throw error;
}

// 実行
executeSendMessage();
