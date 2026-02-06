// 新的 API 客户端 - 使用后端代理
export class GoldApi {
    constructor() {
        this.baseUrl = '/api';
        this.currentPrice = null; // 存储当前金价用于统计计算
    }

    // 获取金价和历史数据
    async fetchGoldPrice() {
        try {
            // 1. 获取当前金价（会触发保存到历史表）
            const priceResponse = await fetch(`${this.baseUrl}/gold-price`);
            const priceResult = await priceResponse.json();

            if (priceResult.success && priceResult.price) {
                this.currentPrice = priceResult.price;
                console.log("✅ 当前金价:", this.currentPrice, "元/克");
            } else if (priceResult.mock) {
                this.currentPrice = priceResult.price;
                console.warn("⚠️ 使用模拟数据:", this.currentPrice, "元/克");
            }

            // 2. 获取历史数据用于图表
            const historyResponse = await fetch(`${this.baseUrl}/gold-price/history`);
            const historyResult = await historyResponse.json();

            if (historyResult.success && historyResult.data && historyResult.data.length > 0) {
                console.log(`📊 获取到 ${historyResult.data.length} 条历史数据`);

                // 确保最后一个点是当前价格
                const data = historyResult.data;
                if (this.currentPrice) {
                    data.push([Date.now(), this.currentPrice]);
                }
                return data;
            } else {
                // 没有历史数据时，返回当前价格作为单点
                console.log("📊 暂无历史数据，显示当前价格");
                if (this.currentPrice) {
                    return [[Date.now(), this.currentPrice]];
                }
                return this.getMockData();
            }
        } catch (error) {
            console.error("❌ 获取金价失败:", error);
            return this.getMockData();
        }
    }

    getMockData() {
        // 生成模拟数据（仅在完全无法获取数据时使用）
        const data = [];
        let price = 1080;
        const now = Date.now();

        for (let i = 144; i >= 0; i--) {
            price = price + (Math.random() - 0.5) * 2;
            data.push([
                now - i * 10 * 60 * 1000,
                parseFloat(price.toFixed(2))
            ]);
        }
        this.currentPrice = data[data.length - 1][1];
        return data;
    }
}
