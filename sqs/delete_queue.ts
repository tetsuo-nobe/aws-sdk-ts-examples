import {
    SQSClient,
    DeleteQueueCommand,
    DeleteQueueCommandOutput,
    GetQueueUrlCommand
} from "@aws-sdk/client-sqs";
import { QUEUE_NAME, DEFAULT_REGION } from "./config";

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
 * SQSキューを削除する
 * @returns Promise<void>
 */
async function deleteQueue(): Promise<void> {
    const region: string = process.env.AWS_REGION || DEFAULT_REGION;
    
    // SQSクライアントを作成
    const client: SQSClient = new SQSClient({ region });

    try {
        console.log(`SQSキューを削除します: ${QUEUE_NAME}`);
        console.log("==================");

        // キューURLを取得
        const queueUrl = await getQueueUrl(client);
        console.log(`キューURL: ${queueUrl}\n`);

        // DeleteQueueコマンドを実行
        const command: DeleteQueueCommand = new DeleteQueueCommand({
            QueueUrl: queueUrl
        });

        const response: DeleteQueueCommandOutput = await client.send(command);

        displaySuccess();
    } catch (error) {
        handleError(error);
    }
}

/**
 * キュー削除成功時のメッセージを表示
 */
function displaySuccess(): void {
    console.log("✓ キュー削除成功!");
    console.log("==================");
    console.log(`キュー名: ${QUEUE_NAME}`);
    console.log("\n注意: キューは即座に削除されますが、削除後60秒間は同じ名前のキューを作成できません。");
}

/**
 * エラーハンドリング
 * @param error - キャッチされたエラー
 */
function handleError(error: unknown): never {
    if (error instanceof Error) {
        console.error("✗ エラーが発生しました:", error.message);
        
        // AWS SDKの一般的なエラーをチェック
        if (error.name === "QueueDoesNotExist") {
            console.error("キューが存在しません。既に削除されている可能性があります。");
        } else if (error.name === "AWS.SimpleQueueService.NonExistentQueue") {
            console.error("指定されたキューが見つかりません。");
        }
        
        console.error("スタックトレース:", error.stack);
    } else {
        console.error("✗ 予期しないエラーが発生しました:", error);
    }
    throw error;
}

// 実行
deleteQueue();
