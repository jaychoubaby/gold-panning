export class Storage {
    constructor() {
        this.STORAGE_KEY = 'gold_tracker_data_v1';
    }

    getAllTransactions() {
        const data = localStorage.getItem(this.STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    }

    addTransaction(transaction) {
        const transactions = this.getAllTransactions();
        transactions.push(transaction);
        // Sort by date descending
        transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        this.saveData(transactions);
        return transactions;
    }

    deleteTransaction(id) {
        let transactions = this.getAllTransactions();
        transactions = transactions.filter(t => t.id !== id);
        this.saveData(transactions);
        return transactions;
    }

    saveData(data) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    }

    importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (Array.isArray(data)) {
                this.saveData(data);
                return true;
            }
            return false;
        } catch (e) {
            console.error("Import failed", e);
            return false;
        }
    }

    getSummary() {
        const txns = this.getAllTransactions();
        let totalWeight = 0;
        let totalCost = 0;

        txns.forEach(t => {
            if (t.type === 'buy') {
                totalWeight += parseFloat(t.weight);
                totalCost += parseFloat(t.amount);
            } else if (t.type === 'sell') {
                totalWeight -= parseFloat(t.weight);
                // Cost calculation for selling is complex (FIFO vs Avg). 
                // For simple tracker, we might just track held weight/cost.
                // Or simply subtract proportional cost?
                // For now, let's keep it simple: Net Weight & Net Spent? 
                // Actually, the user wants to see "Total Held" and "Avg Price".
                // If I sell, I reduce my holdings.
                // Avg Price = Total Cost of Current Holdings / Current Holdings Weight
                
                // Let's implement weighted average cost update on sell?
                // Or just simple:
                // When selling, we reduce "Total Cost" by (Avg Price * Sold Weight)
                // This keeps Avg Price constant during sales.
                
                // HOWEVER, iterating cleanly:
                // We better calculate it properly if we want 'Profit'.
            }
        });
        
        // Re-calculate strictly based on "Current Holdings" logic
        // Simplified approach:
        let heldWeight = 0;
        let heldCost = 0;
        
        // We need to process in chronological order to get accurate Average Cost at that moment
        const chronological = [...txns].sort((a, b) => new Date(a.date) - new Date(b.date));
        
        let realizedProfit = 0;

        chronological.forEach(t => {
            const w = parseFloat(t.weight);
            const a = parseFloat(t.amount);
            
            if (t.type === 'buy') {
                heldCost += a;
                heldWeight += w;
            } else {
                // Sell
                if (heldWeight > 0) {
                    const avgCost = heldCost / heldWeight;
                    const costOfSold = avgCost * w;
                    heldCost -= costOfSold;
                    heldWeight -= w;
                    realizedProfit += (a - costOfSold);
                } else {
                    // Short selling? Unlikely for this user. Ignore or just track value.
                    realizedProfit += a; 
                }
            }
        });

        const avgPrice = heldWeight > 0 ? heldCost / heldWeight : 0;

        return {
            totalWeight: heldWeight,
            totalCost: heldCost,
            avgPrice: avgPrice,
            realizedProfit: realizedProfit
        };
    }
}
