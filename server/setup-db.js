import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

async function setupDatabase() {
    console.log('🔧 开始初始化数据库...\n');

    // 创建数据库连接
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        multipleStatements: true
    });

    console.log('✅ 数据库连接成功\n');

    try {
        // 读取 schema.sql
        const schemaPath = path.join(__dirname, '../database/schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log('📄 执行建表语句...\n');

        // 执行 SQL
        const [results] = await connection.query(schemaSql);

        console.log('✅ 数据库表创建成功！\n');

        // 验证数据
        const [rows] = await connection.query('SELECT * FROM gold_transactions');
        console.log(`📊 当前数据库中有 ${rows.length} 条交易记录：\n`);
        rows.forEach(row => {
            console.log(`  - ${row.date} | ${row.type} | ${row.price}元/克 | ${row.weight}g | ${row.amount}元`);
        });

        console.log('\n✅ 数据库初始化完成！');

    } catch (error) {
        console.error('❌ 初始化失败:', error.message);
        throw error;
    } finally {
        await connection.end();
    }
}

setupDatabase()
    .then(() => {
        console.log('\n👍 可以启动服务器了: npm start');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ 错误:', error);
        process.exit(1);
    });
