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

  async predictExchangeRate(historicalData, fromCurrency, toCurrency) {
    await this.initialize();
    
    // Ensure we have exactly 30 data points and reshape for LSTM
    const data = historicalData.slice(-30).map(Number);
    while (data.length < 30) {
      data.unshift(data[0]); // Pad with first value if needed
    }
    
    // Prepare data - reshape to [1, 30, 1] for LSTM
    const reshapedData = [data.map(value => [value])];
    const tensor = tf.tensor3d(reshapedData);
    
    // Make predictions for next 7 days
    const predictions = [];
    let currentInput = tensor;
    
    for (let i = 0; i < 7; i++) {
      const prediction = await this.model.predict(currentInput).data();
      const baseConfidence = this._calculateConfidence(data, prediction[0]);
      
      // Reduce confidence for predictions further in the future
      const timeDecay = Math.max(0, 5 * i); // 5% reduction per day
      const adjustedConfidence = Math.max(20, baseConfidence - timeDecay);
      
      predictions.push({
        day: i + 1,
        rate: prediction[0],
        confidence: adjustedConfidence
      });
      
      // Update input for next prediction
      const newData = [...data.slice(1), prediction[0]];
      currentInput.dispose();
      currentInput = tf.tensor3d([newData.map(value => [value])]);
    }
    
    // Cleanup
    tensor.dispose();
    currentInput.dispose();
    
    return {
      predictions,
      bestTime: this._findBestExchangeTime(predictions),
      fromCurrency,
      toCurrency
    };
  }

  _calculateConfidence(historicalData, prediction) {
    const mean = historicalData.reduce((a, b) => a + b) / historicalData.length;
    
    // Calculate relative volatility
    const volatility = historicalData.reduce((sum, rate) => {
      const percentChange = Math.abs((rate - mean) / mean) * 100;
      return sum + percentChange;
    }, 0) / historicalData.length;
    
    // Calculate prediction deviation
    const predictionChange = Math.abs((prediction - mean) / mean) * 100;
    
    // Base confidence on historical volatility and prediction deviation
    let confidence = 100;
    
    // Reduce confidence based on volatility (max 30% reduction)
    confidence -= Math.min(30, volatility * 2);
    
    // Reduce confidence based on how far the prediction is from mean (max 40% reduction)
    confidence -= Math.min(40, predictionChange * 3);
    
    // Add time decay - predictions further in future are less confident
    const timeDecay = 5; // 5% reduction per day in future
    
    // Ensure confidence stays between 20% and 95%
    return Math.min(95, Math.max(20, confidence));
  }

  _findBestExchangeTime(predictions) {
    // Find the best rate with its confidence
    const bestPrediction = predictions.reduce((best, current) => {
      const score = current.rate * (current.confidence / 100); // Weight rate by confidence
      return score > best.score ? { ...current, score } : best;
    }, { score: -Infinity });

    return {
      day: bestPrediction.day,
      rate: bestPrediction.rate,
      confidence: bestPrediction.confidence,
      potentialSavings: this._calculatePotentialSavings(predictions[0].rate, bestPrediction.rate)
    };
  }

  _calculatePotentialSavings(currentRate, predictedBestRate) {
    // Calculate percentage improvement
    const improvement = ((predictedBestRate - currentRate) / currentRate) * 100;
    return {
      percentage: improvement,
      // For a standard transfer of 1000 units
      exampleAmount: Math.abs(1000 * (predictedBestRate - currentRate))
    };
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
