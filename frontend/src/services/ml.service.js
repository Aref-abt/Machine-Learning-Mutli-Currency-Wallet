import * as tf from '@tensorflow/tfjs';

export class MLService {
  constructor() {
    this.model = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    // Create a sequential model for exchange rate prediction
    this.model = tf.sequential({
      layers: [
        tf.layers.lstm({
          units: 50,
          returnSequences: true,
          inputShape: [30, 1] // 30 days of historical data
        }),
        tf.layers.dropout(0.2),
        tf.layers.lstm({
          units: 50,
          returnSequences: false
        }),
        tf.layers.dropout(0.2),
        tf.layers.dense({ units: 1 })
      ]
    });

    this.model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError'
    });

    this.initialized = true;
  }

  async predictExchangeRate(historicalData) {
    await this.initialize();
    
    // Ensure we have exactly 30 data points and reshape for LSTM
    const data = historicalData.slice(-30).map(Number);
    while (data.length < 30) {
      data.unshift(data[0]); // Pad with first value if needed
    }
    
    // Prepare data - reshape to [1, 30, 1] for LSTM
    // Create proper 3D array structure [batch_size, time_steps, features]
    const reshapedData = [data.map(value => [value])];
    const tensor = tf.tensor3d(reshapedData);
    
    // Make prediction
    const prediction = await this.model.predict(tensor).data();
    
    // Cleanup
    tensor.dispose();
    
    return prediction[0];
  }

  async detectAnomaly(transaction, userHistory) {
    // Simple anomaly detection based on amount and frequency
    const averageAmount = userHistory.reduce((acc, curr) => acc + curr.amount, 0) / userHistory.length;
    const stdDev = Math.sqrt(
      userHistory.reduce((acc, curr) => acc + Math.pow(curr.amount - averageAmount, 2), 0) / userHistory.length
    );

    // Z-score calculation
    const zScore = Math.abs((transaction.amount - averageAmount) / stdDev);
    
    // Consider it suspicious if z-score > 2 (95% confidence interval)
    return {
      isAnomaly: zScore > 2,
      confidence: (1 - (1 / (1 + Math.exp(-zScore)))) * 100,
      reason: zScore > 2 ? 'Unusual transaction amount' : 'Normal transaction'
    };
  }

  async analyzeTrends(transactions) {
    // Group transactions by currency
    const currencyGroups = {};
    transactions.forEach(t => {
      if (!currencyGroups[t.currency]) {
        currencyGroups[t.currency] = [];
      }
      currencyGroups[t.currency].push(t);
    });

    // Analyze trends for each currency
    const trends = {};
    for (const [currency, txs] of Object.entries(currencyGroups)) {
      const amounts = txs.map(t => t.amount);
      const trend = tf.tidy(() => {
        const tensor = tf.tensor1d(amounts);
        // Calculate standard deviation manually
        const mean = tensor.mean();
        const meanVal = mean.dataSync()[0];
        const squaredDiffs = tensor.sub(meanVal).square();
        const variance = squaredDiffs.mean();
        const stdDev = tf.sqrt(variance);

        return {
          mean: meanVal,
          min: tensor.min().dataSync()[0],
          max: tensor.max().dataSync()[0],
          std: stdDev.dataSync()[0]
        };
      });
      trends[currency] = trend;
    }

    return trends;
  }
}
