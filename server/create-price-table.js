import { pool } from './db.js';

async function createPriceHistoryTable() {
    console.log('🔧 创建金价历史表...');

    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS gold_price_history (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                timestamp DATETIME NOT NULL COMMENT '价格时间',
                buy_price DECIMAL(10, 2) NOT NULL COMMENT '买入价（元/克）',
                sell_price DECIMAL(10, 2) NULL COMMENT '卖出价（元/克）',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY idx_timestamp (timestamp),
                INDEX idx_created (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='金价历史记录表'
        `);

        console.log('✅ 金价历史表创建成功!');

        // 检查表结构
        const [rows] = await pool.query('SELECT COUNT(*) as count FROM gold_price_history');
        console.log(`📊 当前历史表有 ${rows[0].count} 条记录`);

    } catch (error) {
        console.error('❌ 创建表失败:', error.message);
    } finally {
        await pool.end();
    }
}

createPriceHistoryTable();
