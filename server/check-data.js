import { pool } from './db.js';

async function checkData() {
    try {
        const [rows] = await pool.query('SELECT * FROM gold_transactions ORDER BY date DESC');
        console.log('\n📊 数据库中的交易记录：\n');
        console.log('共 ' + rows.length + ' 条记录\n');
        rows.forEach((row, index) => {
            console.log(`${index + 1}. ID: ${row.id.substring(0, 8)}...`);
            console.log(`   日期: ${row.date}`);
            console.log(`   类型: ${row.type === 'buy' ? '买入' : '卖出'}`);
            console.log(`   单价: ${row.price} 元/克`);
            console.log(`   重量: ${row.weight} 克`);
            console.log(`   总额: ${row.amount} 元\n`);
        });
        await pool.end();
    } catch (error) {
        console.error('查询失败:', error);
    }
}

checkData();
