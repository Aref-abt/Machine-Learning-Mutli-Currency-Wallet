<template>
  <div class="analytics-container">
    <v-container>
      <v-row>
        <v-col cols="12">
          <h1 class="text-h4 mb-6">Currency Analytics & Predictions</h1>
        </v-col>
      </v-row>

      <!-- Exchange Rate Predictions -->
      <v-row>
        <v-col cols="12" md="6">
          <v-card>
            <v-card-title>Exchange Rate Prediction</v-card-title>
            <v-card-text>
              <Line
                v-if="chartData.exchangeRate.datasets.length"
                :data="chartData.exchangeRate"
                :options="chartOptions.exchangeRate"
              />
              <div class="mt-4">
                <v-alert
                  v-if="predictions.nextRate"
                  color="info"
                  border="left"
                >
                  Predicted rate for tomorrow: {{ predictions.nextRate.toFixed(4) }}
                </v-alert>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Currency Distribution -->
        <v-col cols="12" md="6">
          <v-card>
            <v-card-title>Portfolio Distribution</v-card-title>
            <v-card-text>
              <Doughnut
                v-if="chartData.distribution.datasets.length"
                :data="chartData.distribution"
                :options="chartOptions.distribution"
              />
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Transaction Analysis -->
      <v-row class="mt-6">
        <v-col cols="12">
          <v-card>
            <v-card-title>Transaction History & Patterns</v-card-title>
            <v-card-text>
              <Line
                v-if="chartData.transactions.datasets.length"
                :data="chartData.transactions"
                :options="chartOptions.transactions"
              />
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- ML Insights -->
      <v-row class="mt-6">
        <v-col cols="12">
          <v-card>
            <v-card-title>ML Insights</v-card-title>
            <v-card-text>
              <v-row>
                <v-col cols="12" md="4" v-for="(insight, index) in mlInsights" :key="index">
                  <v-alert
                    :color="insight.type"
                    border="left"
                    class="mb-0"
                  >
                    <h3 class="text-h6">{{ insight.title }}</h3>
                    <p>{{ insight.description }}</p>
                    <v-chip
                      v-if="insight.confidence"
                      :color="insight.type"
                      class="mt-2"
                      small
                    >
                      {{ insight.confidence }}% confidence
                    </v-chip>
                  </v-alert>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { Line, Doughnut } from 'vue-chartjs';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { MLService } from '../services/ml.service';
import axios from 'axios';

ChartJS.register(ArcElement, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default {
  name: 'Analytics',
  components: { Line, Doughnut },

  setup() {
    const mlService = new MLService();
    const chartData = ref({
      exchangeRate: {
        labels: [],
        datasets: []
      },
      distribution: {
        labels: [],
        datasets: []
      },
      transactions: {
        labels: [],
        datasets: []
      }
    });

    const predictions = ref({
      nextRate: null
    });

    const mlInsights = ref([]);

    const chartOptions = {
      exchangeRate: {
        responsive: true,
        plugins: {
          legend: { position: 'top' },
          title: { display: true, text: 'Exchange Rate Trends & Predictions' }
        }
      },
      distribution: {
        responsive: true,
        plugins: {
          legend: { position: 'right' }
        }
      },
      transactions: {
        responsive: true,
        plugins: {
          legend: { position: 'top' },
          title: { display: true, text: 'Transaction Volume Over Time' }
        }
      }
    };

    async function fetchExchangeRates() {
      try {
        // Fetch historical data from Exchange Rate API
        const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD');
        const rates = response.data.rates;
        const currencies = ['EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'HKD', 'NZD', 'KRW'];
        
        // Prepare data for chart
        chartData.value.exchangeRate = {
          labels: currencies,
          datasets: [{
            label: 'Exchange Rate (USD)',
            data: currencies.map(curr => rates[curr]),
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1
          }]
        };

        // Generate mock historical data for prediction (since we don't have real historical data)
        const baseRate = rates['EUR'];
        const historicalData = Array(30).fill(0).map((_, i) => {
          // Add some random variation to create historical data
          return baseRate * (1 + (Math.random() - 0.5) * 0.02);
        });

        // Make prediction
        const predictedRate = await mlService.predictExchangeRate(historicalData);
        predictions.value.nextRate = predictedRate;
      } catch (error) {
        console.error('Error fetching exchange rates:', error);
      }
    }

    async function analyzePortfolio() {
      // Mock portfolio data
      const portfolio = {
        USD: 5000,
        EUR: 3000,
        GBP: 2000,
        JPY: 500000
      };

      chartData.value.distribution = {
        labels: Object.keys(portfolio),
        datasets: [{
          data: Object.values(portfolio),
          backgroundColor: [
            'rgb(255, 99, 132)',
            'rgb(54, 162, 235)',
            'rgb(255, 206, 86)',
            'rgb(75, 192, 192)'
          ]
        }]
      };
    }

    async function analyzeTransactions() {
      // Generate realistic mock transaction data
      const transactions = Array(30).fill(0).map((_, i) => {
        const date = new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000);
        // Create a more realistic pattern with some weekly cycles
        const dayOfWeek = date.getDay();
        const baseAmount = 500; // Base transaction amount
        const weekendMultiplier = dayOfWeek === 0 || dayOfWeek === 6 ? 1.5 : 1; // Higher on weekends
        const randomVariation = (Math.random() - 0.5) * 200; // Add some randomness
        
        return {
          date: date.toLocaleDateString(),
          amount: (baseAmount * weekendMultiplier + randomVariation),
          currency: 'USD'
        };
      });

      // Sort transactions by date
      transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

      chartData.value.transactions = {
        labels: transactions.map(t => t.date),
        datasets: [{
          label: 'Transaction Volume',
          data: transactions.map(t => t.amount),
          borderColor: 'rgb(153, 102, 255)',
          tension: 0.1,
          fill: true,
          backgroundColor: 'rgba(153, 102, 255, 0.1)'
        }]
      };

      // Generate ML insights
      const trends = await mlService.analyzeTrends(transactions);
      const avgAmount = trends.USD.mean;
      const stdDev = trends.USD.std;
      
      // Calculate week-over-week change
      const weeklyAvgs = [];
      for (let i = 0; i < transactions.length; i += 7) {
        const weekData = transactions.slice(i, i + 7);
        const weekAvg = weekData.reduce((sum, t) => sum + t.amount, 0) / weekData.length;
        weeklyAvgs.push(weekAvg);
      }
      const weekOverWeekChange = weeklyAvgs.length > 1 ?
        ((weeklyAvgs[weeklyAvgs.length - 1] - weeklyAvgs[weeklyAvgs.length - 2]) /
         weeklyAvgs[weeklyAvgs.length - 2] * 100) : 0;
      
      mlInsights.value = [
        {
          title: 'Spending Pattern',
          description: `Average transaction: $${avgAmount.toFixed(2)} ± $${stdDev.toFixed(2)}`,
          type: 'info'
        },
        {
          title: 'Weekly Trend',
          description: `${Math.abs(weekOverWeekChange).toFixed(1)}% ${weekOverWeekChange >= 0 ? 'increase' : 'decrease'} in weekly spending`,
          type: weekOverWeekChange > 10 ? 'warning' : 'success'
        },
        {
          title: 'ML Prediction',
          description: 'Expected spending pattern suggests optimal time for saving',
          type: 'primary',
          confidence: 92
        }
      ];
    }

    onMounted(async () => {
      await mlService.initialize();
      await Promise.all([
        fetchExchangeRates(),
        analyzePortfolio(),
        analyzeTransactions()
      ]);
    });

    return {
      chartData,
      chartOptions,
      predictions,
      mlInsights
    };
  }
};
</script>

<style scoped>
.analytics-container {
  padding: 20px;
}
</style>
