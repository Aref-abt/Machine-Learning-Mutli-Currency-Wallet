<template>
  <div class="analytics-container">
    <v-container>
      <v-row>
        <v-col cols="12">
          <h1 class="text-h4 mb-6">Currency Analytics & Predictions</h1>
        </v-col>
      </v-row>

      <!-- ML Insights -->
      <v-row>
        <v-col cols="12" lg="8">
          <MLInsights />
        </v-col>

        <!-- Portfolio Distribution -->
        <v-col cols="12" lg="4">
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
    </v-container>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { Line, Doughnut } from 'vue-chartjs';
import MLInsights from '../components/MLInsights.vue';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { MLService } from '../services/ml.service';


ChartJS.register(ArcElement, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default {
  name: 'Analytics',
  components: { Line, Doughnut, MLInsights },

  setup() {
    const mlService = new MLService();
    const chartData = ref({

      distribution: {
        labels: [],
        datasets: []
      },
      transactions: {
        labels: [],
        datasets: []
      }
    });

    const chartOptions = {
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
      // Mock trends data
      const avgAmount = 500;
      const stdDev = 100;
      
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
      
      const mlInsights = [
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
        analyzePortfolio(),
        analyzeTransactions()
      ]);
    });

    return {
      chartData,
      chartOptions
    };
  }
};
</script>

<style scoped>
.analytics-container {
  padding: 20px;
}

.v-card {
  height: 100%;
}

.v-card-text {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
