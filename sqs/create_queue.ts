import {
    SQSClient,
    CreateQueueCommand,
    CreateQueueCommandOutput
} from "@aws-sdk/client-sqs";
import { QUEUE_NAME, DEFAULT_REGION } from "./config";

/**
 * 標準SQSキューを作成する
 * @returns Promise<void>
 */
async function createQueue(): Promise<void> {
    const region: string = process.env.AWS_REGION || DEFAULT_REGION;
    
    // SQSクライアントを作成
    const client: SQSClient = new SQSClient({ region });

    try {
        console.log(`標準SQSキューを作成します: ${QUEUE_NAME}`);
        console.log("==================");

        // CreateQueueコマンドを実行
        const command: CreateQueueCommand = new CreateQueueCommand({
            QueueName: QUEUE_NAME,
            Attributes: {
                // 標準キューの設定
                "DelaySeconds": "0",
                "MessageRetentionPeriod": "345600", // 4日間（秒単位）
                "VisibilityTimeout": "30", // 30秒
                "ReceiveMessageWaitTimeSeconds": "0" // ショートポーリング（待機なし）
            }
        });

        const response: CreateQueueCommandOutput = await client.send(command);

        displaySuccess(response);
    } catch (error) {
        handleError(error);
    }
}

/**
 * キュー作成成功時のメッセージを表示
 * @param response - CreateQueueコマンドのレスポンス
 */
function displaySuccess(response: CreateQueueCommandOutput): void {
    console.log("✓ キュー作成成功!");
    console.log("==================");
    console.log(`キューURL: ${response.QueueUrl ?? "不明"}`);
    console.log("\n注意: 同じ名前のキューが既に存在する場合は、既存のキューURLが返されます。");
}

/**
 * エラーハンドリング
 * @param error - キャッチされたエラー
 */
function handleError(error: unknown): never {
    if (error instanceof Error) {
        console.error("✗ エラーが発生しました:", error.message);
        
        // AWS SDKの一般的なエラーをチェック
        if (error.name === "QueueDeletedRecently") {
            console.error("このキュー名は最近削除されました。60秒待ってから再試行してください。");
        } else if (error.name === "QueueNameExists") {
            console.error("このキュー名は既に存在します。");
        }
        
        console.error("スタックトレース:", error.stack);
    } else {
        console.error("✗ 予期しないエラーが発生しました:", error);
    }
    throw error;
}

// 実行
createQueue();
