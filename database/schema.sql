-- ============================================
-- 黄金记账系统 - 数据库表结构
-- ============================================
-- 数据库: gold_panning

-- 删除已存在的表（如果需要重建）
DROP TABLE IF EXISTS `gold_transactions`;

-- 创建交易记录表
CREATE TABLE `gold_transactions` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '交易ID (UUID)',
  `date` DATETIME NOT NULL COMMENT '交易时间',
  `type` ENUM('buy', 'sell') NOT NULL COMMENT '交易类型：buy=买入, sell=卖出',
  `price` DECIMAL(10, 2) NOT NULL COMMENT '单价（元/克）',
  `weight` DECIMAL(10, 4) NOT NULL COMMENT '重量（克）',
  `amount` DECIMAL(12, 2) NOT NULL COMMENT '总金额（元）',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '记录创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '记录更新时间',
  INDEX `idx_date` (`date`),
  INDEX `idx_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='黄金交易记录表';

-- 插入现有数据
INSERT INTO `gold_transactions` (`id`, `date`, `type`, `price`, `weight`, `amount`) VALUES
('209a0cba-5a38-4ffb-9801-8faaac73df3b', '2026-02-03 09:37:00', 'buy', 620.00, 1.0000, 620.00),
('235fd85a-d68b-44fe-90e8-a2bc0059306b', '2026-02-02 10:00:00', 'buy', 1025.00, 1.0614, 1087.93);

-- 验证数据
SELECT 
    COUNT(*) as total_records,
    SUM(CASE WHEN type = 'buy' THEN 1 ELSE 0 END) as buy_count,
    SUM(CASE WHEN type = 'sell' THEN 1 ELSE 0 END) as sell_count,
    SUM(weight) as total_weight,
    SUM(amount) as total_amount
FROM gold_transactions;

-- ============================================
-- 金价历史表（用于图表展示）
-- ============================================

DROP TABLE IF EXISTS `gold_price_history`;

CREATE TABLE `gold_price_history` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `timestamp` DATETIME NOT NULL COMMENT '价格时间',
  `buy_price` DECIMAL(10, 2) NOT NULL COMMENT '买入价（元/克）',
  `sell_price` DECIMAL(10, 2) NULL COMMENT '卖出价（元/克）',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `idx_timestamp` (`timestamp`),
  INDEX `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='金价历史记录表';
