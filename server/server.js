import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import https from 'https';
import crypto from 'crypto';
import { pool, testConnection } from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 创建支持旧版SSL的HTTPS代理
const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
    secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT
});

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务（前端）
app.use(express.static('../'));

// ============================================
// API 路由
// ============================================

// 1. 获取所有交易记录
app.get('/api/transactions', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM gold_transactions ORDER BY date DESC'
        );
        res.json(rows);
    } catch (error) {
        console.error('获取交易记录失败:', error);
        res.status(500).json({ error: '获取交易记录失败', message: error.message });
    }
});

// 2. 添加交易记录
app.post('/api/transactions', async (req, res) => {
    try {
        const { id, date, type, price, weight, amount } = req.body;

        if (!id || !date || !type || !price || !weight || !amount) {
            return res.status(400).json({ error: '缺少必填字段' });
        }

        const [result] = await pool.query(
            'INSERT INTO gold_transactions (id, date, type, price, weight, amount) VALUES (?, ?, ?, ?, ?, ?)',
            [id, date, type, parseFloat(price), parseFloat(weight), parseFloat(amount)]
        );

        res.status(201).json({
            success: true,
            id,
            message: '交易记录添加成功'
        });
    } catch (error) {
        console.error('添加交易记录失败:', error);
        res.status(500).json({ error: '添加交易记录失败', message: error.message });
    }
});

// 3. 删除交易记录
app.delete('/api/transactions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query(
            'DELETE FROM gold_transactions WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: '记录不存在' });
        }

        res.json({ success: true, message: '交易记录删除成功' });
    } catch (error) {
        console.error('删除交易记录失败:', error);
        res.status(500).json({ error: '删除交易记录失败', message: error.message });
    }
});

// 4. 获取金价（代理工行API）并保存到历史表
app.get('/api/gold-price', async (req, res) => {
    try {
        console.log('📡 正在请求工行 API...');

        const response = await axios.post(
            process.env.ICBC_API_URL || 'https://mybank.icbc.com.cn/servlet/AsynGetDataServlet',
            'tranCode=A00505',
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'Accept': 'application/json, text/javascript, */*; q=0.01',
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                },
                timeout: 10000,
                httpsAgent: httpsAgent
            }
        );

        console.log('✅ 工行 API 响应成功');

        const data = response.data;
        if (data && data.pronoinfo && data.pronoinfo[0]) {
            const buyPriceInLi = parseInt(data.pronoinfo[0].buyprice);
            const sellPriceInLi = parseInt(data.pronoinfo[0].sellprice);
            const buyPrice = (buyPriceInLi / 100).toFixed(2);
            const sellPrice = (sellPriceInLi / 100).toFixed(2);

            console.log(`💰 当前金价: 买入 ${buyPrice} 元/克, 卖出 ${sellPrice} 元/克`);

            // 保存到金价历史表（每分钟只保存一次）
            try {
                await pool.query(
                    `INSERT INTO gold_price_history (timestamp, buy_price, sell_price) 
                     VALUES (DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:00'), ?, ?)
                     ON DUPLICATE KEY UPDATE buy_price = VALUES(buy_price), sell_price = VALUES(sell_price)`,
                    [parseFloat(buyPrice), parseFloat(sellPrice)]
                );
                console.log('📊 金价已保存到历史表');
            } catch (dbError) {
                console.error('保存金价历史失败:', dbError.message);
            }

            res.json({
                success: true,
                price: parseFloat(buyPrice),
                sellPrice: parseFloat(sellPrice),
                raw: data,
                timestamp: new Date().toISOString()
            });
        } else {
            throw new Error('API 返回数据格式异常');
        }
    } catch (error) {
        console.error('❌ 工行 API 请求失败:', error.message);

        res.json({
            success: false,
            error: error.message,
            mock: true,
            price: 1080 + Math.random() * 10,
            timestamp: new Date().toISOString()
        });
    }
});

// 5. 获取金价历史数据（用于图表）
app.get('/api/gold-price/history', async (req, res) => {
    try {
        // 获取最近24小时的数据，按时间升序
        const [rows] = await pool.query(
            `SELECT timestamp, buy_price, sell_price 
             FROM gold_price_history 
             WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
             ORDER BY timestamp ASC`
        );

        // 转换为图表需要的格式 [[timestamp, price], ...]
        const data = rows.map(row => [
            new Date(row.timestamp).getTime(),
            parseFloat(row.buy_price)
        ]);

        res.json({
            success: true,
            count: data.length,
            data: data
        });
    } catch (error) {
        console.error('获取金价历史失败:', error);
        res.status(500).json({ error: '获取金价历史失败', message: error.message });
    }
});

// 6. 健康检查
app.get('/api/health', async (req, res) => {
    const dbOk = await testConnection();
    res.json({
        status: dbOk ? 'healthy' : 'unhealthy',
        database: dbOk ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

// ============================================
// 启动服务器
// ============================================
app.listen(PORT, async () => {
    console.log('='.repeat(50));
    console.log(`🚀 黄金记账系统后端服务启动成功!`);
    console.log(`📍 服务地址: http://localhost:${PORT}`);
    console.log(`🌐 前端页面: http://localhost:${PORT}/index.html`);
    console.log(`🔌 API 端点: http://localhost:${PORT}/api/*`);
    console.log('='.repeat(50));

    await testConnection();
});

process.on('SIGTERM', async () => {
    console.log('收到 SIGTERM 信号，正在关闭服务器...');
    await pool.end();
    process.exit(0);
});
