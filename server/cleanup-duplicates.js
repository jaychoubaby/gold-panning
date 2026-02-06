import { pool } from './db.js';

async function removeduplicates() {
    console.log('🧹 清理重复数据...');

    try {
        // 查找重复记录
        const [rows] = await pool.query(`
            SELECT id, date, type, price, weight, amount 
            FROM gold_transactions 
            ORDER BY date
        `);

        console.log('📊 当前所有记录:');
        rows.forEach((r, i) => {
            console.log(`${i + 1}. ${r.id.substring(0, 8)}... | ${new Date(r.date).toLocaleString()} | ${r.type} | ¥${r.price} | ${r.weight}g`);
        });

        // 找出重复的 (同一时间、同一价格、同一重量)
        const seen = {};
        const toDelete = [];

        for (const row of rows) {
            const key = `${row.date}_${row.price}_${row.weight}`;
            if (seen[key]) {
                toDelete.push(row.id);
            } else {
                seen[key] = true;
            }
        }

        if (toDelete.length > 0) {
            console.log(`\n🗑️ 删除 ${toDelete.length} 条重复记录...`);
            for (const id of toDelete) {
                await pool.query('DELETE FROM gold_transactions WHERE id = ?', [id]);
                console.log(`  删除: ${id.substring(0, 8)}...`);
            }
        } else {
            console.log('\n✨ 没有重复记录');
        }

        // 显示最终记录
        const [final] = await pool.query(`
            SELECT date, type, price, weight, amount 
            FROM gold_transactions 
            ORDER BY date
        `);

        console.log('\n✅ 最终交易记录:');
        final.forEach((r, i) => {
            console.log(`${i + 1}. ${new Date(r.date).toLocaleString()} | ${r.type} | ¥${r.price}/克 | ${r.weight}g | ¥${r.amount}`);
        });

    } catch (error) {
        console.error('❌ 错误:', error.message);
    } finally {
        await pool.end();
    }
}

removeduplicates();
