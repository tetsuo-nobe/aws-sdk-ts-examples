/**
 * SQS操作で使用する型定義
 */

/**
 * 注文情報の型定義
 */
export interface OrderInfo {
    orderId: string;
    customerId: string;
    customerName: string;
    items: Array<{
        productId: string;
        productName: string;
        quantity: number;
        price: number;
    }>;
    totalAmount: number;
    orderDate: string;
    shippingAddress: {
        postalCode: string;
        prefecture: string;
        city: string;
        address: string;
    };
}
