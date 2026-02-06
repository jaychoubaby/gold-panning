import { pool } from './db.js';

async function addMissingData() {
    console.log('🔧 添加缺失的交易数据...');

    try {
        // 添加缺失的记录: 2026/1/26 09:48:00 买入 1137.80 4.3944 5000.00
        const result = await pool.query(
            `INSERT INTO gold_transactions (id, date, type, price, weight, amount) 
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE price = VALUES(price)`,
            [
                crypto.randomUUID(),
                '2026-01-26T09:48:00',
                'buy',
                1137.80,
                4.3944,
                5000.00
            ]
        );

        console.log('✅ 数据添加成功!');

        // 显示所有记录
        const [rows] = await pool.query('SELECT * FROM gold_transactions ORDER BY date');
        console.log('\n📊 当前所有交易记录:');
        rows.forEach((row, i) => {
            console.log(`${i + 1}. ${new Date(row.date).toLocaleString()} | ${row.type} | ¥${row.price}/克 | ${row.weight}g | ¥${row.amount}`);
        });

    } catch (error) {
        console.error('❌ 添加数据失败:', error.message);
    } finally {
        await pool.end();
    }
}

addMissingData();
