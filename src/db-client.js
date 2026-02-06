// 数据库客户端 - 通过后端 API 操作数据
export class DatabaseClient {
    constructor() {
        this.baseUrl = '/api';
    }

    // 获取所有交易记录
    async getTransactions() {
        try {
            const response = await fetch(`${this.baseUrl}/transactions`);
            if (!response.ok) throw new Error('获取交易记录失败');
            return await response.json();
        } catch (error) {
            console.error('获取交易记录失败:', error);
            return [];
        }
    }

    // 添加交易记录
    async addTransaction(transaction) {
        try {
            const response = await fetch(`${this.baseUrl}/transactions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(transaction)
            });

            if (!response.ok) throw new Error('添加交易记录失败');
            return await response.json();
        } catch (error) {
            console.error('添加交易记录失败:', error);
            throw error;
        }
    }

    // 删除交易记录
    async deleteTransaction(id) {
        try {
            const response = await fetch(`${this.baseUrl}/transactions/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('删除交易记录失败');
            return await response.json();
        } catch (error) {
            console.error('删除交易记录失败:', error);
            throw error;
        }
    }

    // 统计数据
    async getStatistics() {
        const transactions = await this.getTransactions();

        let totalWeight = 0;
        let totalSpent = 0;
        let totalSold = 0;
        let soldAmount = 0;

        transactions.forEach(tx => {
            const weight = parseFloat(tx.weight);
            const amount = parseFloat(tx.amount);

            if (tx.type === 'buy') {
                totalWeight += weight;
                totalSpent += amount;
            } else if (tx.type === 'sell') {
                totalWeight -= weight;
                soldAmount += amount;
                totalSold += weight;
            }
        });

        const avgPrice = totalWeight > 0 ? totalSpent / (totalWeight + totalSold) : 0;

        return {
            totalWeight,
            totalSpent,
            avgPrice,
            transactions
        };
    }
}
