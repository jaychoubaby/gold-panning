import { DatabaseClient } from './db-client.js';

const dbClient = new DatabaseClient();
let chartInstance = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    initChart();
    await renderTransactionList();
    await updateStats();
    setupEventListeners();
    await updateChartData();
    setupIframeRefresh();

    // Set default date to now
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('txnDate').value = now.toISOString().slice(0, 16);
});

// 设置工行 iframe 刷新
function setupIframeRefresh() {
    const iframe = document.getElementById('icbcFrame');
    const loading = document.getElementById('iframeLoading');
    const refreshBtn = document.getElementById('refreshIframeBtn');

    if (iframe && loading) {
        iframe.addEventListener('load', () => {
            loading.classList.add('hidden');
        });

        // 5秒后自动隐藏 loading（以防 iframe 加载完成事件不触发）
        setTimeout(() => {
            loading.classList.add('hidden');
        }, 5000);
    }

    if (refreshBtn && iframe) {
        refreshBtn.addEventListener('click', () => {
            loading.classList.remove('hidden');
            iframe.src = iframe.src;
        });
    }
}

// 更新图表数据 - 显示交易操作记录
async function updateChartData() {
    if (!chartInstance) return;

    chartInstance.showLoading();
    try {
        const transactions = await dbClient.getTransactions();

        if (transactions.length === 0) {
            chartInstance.hideLoading();
            chartInstance.setOption({
                graphic: {
                    type: 'text',
                    left: 'center',
                    top: 'middle',
                    style: {
                        text: '暂无交易记录',
                        fontSize: 16,
                        fill: '#94a3b8'
                    }
                }
            });
            return;
        }

        // 按时间排序（升序）
        const sortedTxns = [...transactions].sort((a, b) =>
            new Date(a.date) - new Date(b.date)
        );

        // 准备数据
        const buyData = [];
        const sellData = [];

        sortedTxns.forEach(t => {
            const point = {
                value: [new Date(t.date).getTime(), parseFloat(t.price)],
                weight: parseFloat(t.weight),
                amount: parseFloat(t.amount)
            };

            if (t.type === 'buy') {
                buyData.push(point);
            } else {
                sellData.push(point);
            }
        });

        // 所有交易点用于绘制趋势线
        const allPoints = sortedTxns.map(t => [
            new Date(t.date).getTime(),
            parseFloat(t.price)
        ]);

        const option = {
            tooltip: {
                trigger: 'item',
                formatter: function (params) {
                    if (!params.data) return '';
                    const date = new Date(params.value[0]).toLocaleString();
                    const price = params.value[1].toFixed(2);
                    const weight = params.data.weight?.toFixed(4) || '—';
                    const amount = params.data.amount?.toFixed(2) || '—';
                    const type = params.seriesName;
                    return `
                        <div style="font-weight:600;">${type}</div>
                        <div style="font-size:12px;color:#888;">${date}</div>
                        <div>价格: ¥${price}/克</div>
                        <div>重量: ${weight}g</div>
                        <div>金额: ¥${amount}</div>
                    `;
                }
            },
            legend: {
                data: ['买入', '卖出', '价格趋势'],
                textStyle: { color: '#94a3b8' },
                top: 0
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                top: '40px',
                containLabel: true
            },
            xAxis: {
                type: 'time',
                splitLine: { show: false },
                axisLine: { lineStyle: { color: '#94a3b8' } },
                axisLabel: { color: '#94a3b8' }
            },
            yAxis: {
                type: 'value',
                name: '元/克',
                scale: true,
                splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
                axisLine: { lineStyle: { color: '#94a3b8' } },
                axisLabel: { color: '#94a3b8' }
            },
            series: [
                {
                    name: '价格趋势',
                    type: 'line',
                    smooth: true,
                    symbol: 'none',
                    lineStyle: {
                        color: 'rgba(251, 191, 36, 0.4)',
                        width: 2
                    },
                    areaStyle: {
                        color: {
                            type: 'linear',
                            x: 0, y: 0, x2: 0, y2: 1,
                            colorStops: [
                                { offset: 0, color: 'rgba(251, 191, 36, 0.2)' },
                                { offset: 1, color: 'rgba(251, 191, 36, 0.0)' }
                            ]
                        }
                    },
                    data: allPoints,
                    z: 1
                },
                {
                    name: '买入',
                    type: 'scatter',
                    symbol: 'pin',
                    symbolSize: 50,
                    itemStyle: {
                        color: '#ef4444',
                        shadowBlur: 15,
                        shadowColor: 'rgba(239, 68, 68, 0.6)'
                    },
                    label: {
                        show: true,
                        position: 'inside',
                        formatter: function (params) {
                            return params.data.weight?.toFixed(4) + 'g';
                        },
                        fontSize: 9,
                        color: '#fff',
                        fontWeight: 'bold'
                    },
                    data: buyData,
                    z: 3
                },
                {
                    name: '卖出',
                    type: 'scatter',
                    symbol: 'pin',
                    symbolSize: 50,
                    symbolRotate: 180,
                    itemStyle: {
                        color: '#10b981',
                        shadowBlur: 15,
                        shadowColor: 'rgba(16, 185, 129, 0.6)'
                    },
                    label: {
                        show: true,
                        position: 'inside',
                        formatter: function (params) {
                            return params.data.weight?.toFixed(4) + 'g';
                        },
                        fontSize: 9,
                        color: '#fff',
                        fontWeight: 'bold'
                    },
                    data: sellData,
                    z: 3
                }
            ]
        };

        chartInstance.setOption(option, true);
    } catch (e) {
        console.error("Failed to load chart data", e);
    } finally {
        chartInstance.hideLoading();
    }
}

function setupEventListeners() {
    // Form Submit
    const form = document.getElementById('addForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const txn = {
                id: crypto.randomUUID(),
                date: document.getElementById('txnDate').value,
                type: document.getElementById('txnType').value,
                price: document.getElementById('txnPrice').value,
                weight: document.getElementById('txnWeight').value,
                amount: document.getElementById('txnAmount').value
            };

            try {
                await dbClient.addTransaction(txn);
                form.reset();

                // Reset date to now
                const now = new Date();
                now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
                document.getElementById('txnDate').value = now.toISOString().slice(0, 16);

                await renderTransactionList();
                await updateStats();
                await updateChartData();
            } catch (error) {
                alert('保存失败: ' + error.message);
            }
        });
    }

    // Auto-calculate amount
    const priceInput = document.getElementById('txnPrice');
    const weightInput = document.getElementById('txnWeight');
    const amountInput = document.getElementById('txnAmount');

    function autoCalcAmount() {
        const price = parseFloat(priceInput.value) || 0;
        const weight = parseFloat(weightInput.value) || 0;
        if (price && weight) {
            amountInput.value = (price * weight).toFixed(2);
        }
    }

    if (priceInput && weightInput) {
        priceInput.addEventListener('input', autoCalcAmount);
        weightInput.addEventListener('input', autoCalcAmount);
    }

    // Chart period filter
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            // TODO: 实现筛选逻辑
        });
    });
}

async function renderTransactionList() {
    const tbody = document.querySelector('#txnTable tbody');
    const txns = await dbClient.getTransactions();

    if (!tbody) return;

    tbody.innerHTML = txns.map(t => `
        <tr>
            <td>
                <div style="font-weight:500;">${new Date(t.date).toLocaleDateString()}</div>
                <div style="font-size:0.8em; color:var(--text-secondary)">${new Date(t.date).toLocaleTimeString()}</div>
            </td>
            <td>
                <span style="color: ${t.type === 'buy' ? 'var(--danger-color)' : 'var(--success-color)'}">
                    ${t.type === 'buy' ? '买入' : '卖出'}
                </span>
            </td>
            <td>${parseFloat(t.price).toFixed(2)}</td>
            <td>${parseFloat(t.weight).toFixed(4)}</td>
            <td>${parseFloat(t.amount).toFixed(2)}</td>
            <td>
                <button class="delete-btn" onclick="deleteTxn('${t.id}')">
                    🗑
                </button>
            </td>
        </tr>
    `).join('');

    // Expose delete function globally
    window.deleteTxn = async (id) => {
        if (confirm('确定删除这条记录吗？')) {
            try {
                await dbClient.deleteTransaction(id);
                await renderTransactionList();
                await updateStats();
                await updateChartData();
            } catch (error) {
                alert('删除失败: ' + error.message);
            }
        }
    };
}

async function updateStats() {
    const summary = await dbClient.getStatistics();

    const elTotalWeight = document.getElementById('totalWeight');
    const elTotalCost = document.getElementById('totalCost');
    const elAvgPrice = document.getElementById('avgPrice');
    const elMarketValue = document.getElementById('marketValue');
    const elProfit = document.getElementById('profit');

    if (elTotalWeight) elTotalWeight.innerHTML = `${summary.totalWeight.toFixed(4)} <span class="unit">g</span>`;
    if (elTotalCost) elTotalCost.innerText = `¥${summary.totalSpent.toFixed(2)}`;
    if (elAvgPrice) elAvgPrice.innerHTML = `¥${summary.avgPrice.toFixed(2)} <span class="unit">/g</span>`;

    // 获取工行实时赎回价（sellprice）
    let sellPrice = 1058; // 默认值
    try {
        const response = await fetch('/api/gold-price');
        const result = await response.json();
        if (result.success && result.sellPrice) {
            sellPrice = result.sellPrice;
            console.log('📊 获取赎回价成功:', sellPrice, '元/克');
        }
    } catch (e) {
        console.error('获取赎回价失败，使用默认值');
    }

    // 使用赎回价计算市值
    const marketVal = summary.totalWeight * sellPrice;

    // 计算手续费（千分之五）
    const feeRate = 0.005;
    const fee = marketVal * feeRate;

    // 实际可得 = 市值 - 手续费
    const netValue = marketVal - fee;

    // 盈亏 = 实际可得 - 成本
    const profit = netValue - summary.totalSpent;

    if (elMarketValue) {
        elMarketValue.innerHTML = `¥${marketVal.toFixed(2)}`;
    }

    if (elProfit) {
        const profitColor = profit >= 0 ? '#ef4444' : '#10b981';
        elProfit.innerHTML = `
            <span style="color: ${profitColor}">盈亏: ¥${profit.toFixed(2)}</span>
            <br>
            <span style="font-size: 0.75rem; color: var(--text-secondary);">
                手续费: ¥${fee.toFixed(2)} (0.5%)
            </span>
        `;
    }
}

function initChart() {
    const chartDom = document.getElementById('goldChart');
    if (!chartDom) return;

    chartInstance = echarts.init(chartDom);

    const option = {
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'axis'
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
        },
        xAxis: {
            type: 'time',
            splitLine: { show: false },
            axisLine: { lineStyle: { color: '#94a3b8' } },
            axisLabel: { color: '#94a3b8' }
        },
        yAxis: {
            type: 'value',
            scale: true,
            splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
            axisLine: { lineStyle: { color: '#94a3b8' } },
            axisLabel: { color: '#94a3b8' }
        },
        series: []
    };

    chartInstance.setOption(option);
    window.addEventListener('resize', () => chartInstance.resize());
}
