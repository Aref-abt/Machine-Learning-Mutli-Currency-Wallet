<template>
  <div class="security-dashboard">
    <v-container>
      <v-row>
        <v-col cols="12">
          <h1 class="text-h4 mb-6">Security Dashboard</h1>
        </v-col>
      </v-row>

      <!-- Suspicious Activity Alerts -->
      <v-row>
        <v-col cols="12" md="6">
          <v-card>
            <v-card-title class="d-flex align-center">
              <v-icon color="error" class="mr-2">mdi-alert-circle</v-icon>
              Recent Alerts
            </v-card-title>
            <v-card-text>
              <v-timeline density="compact" align="start">
                <v-timeline-item
                  v-for="alert in securityAlerts"
                  :key="alert.id"
                  :dot-color="alert.severity === 'high' ? 'error' : 'warning'"
                  size="small"
                >
                  <div class="d-flex justify-space-between">
                    <div>
                      <strong>{{ alert.title }}</strong>
                      <div class="text-caption">{{ alert.description }}</div>
                    </div>
                    <v-chip
                      :color="alert.severity === 'high' ? 'error' : 'warning'"
                      size="small"
                      class="ml-2"
                    >
                      {{ alert.confidence }}% confidence
                    </v-chip>
                  </div>
                  <div class="text-caption text-grey">{{ alert.timestamp }}</div>
                </v-timeline-item>
              </v-timeline>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Risk Score -->
        <v-col cols="12" md="6">
          <v-card>
            <v-card-title>Account Risk Assessment</v-card-title>
            <v-card-text>
              <div class="text-center mb-4">
                <v-progress-circular
                  :model-value="riskScore"
                  :color="getRiskColor(riskScore)"
                  size="150"
                  width="15"
                >
                  <div class="text-h5">{{ riskScore }}</div>
                  <div class="text-caption">Risk Score</div>
                </v-progress-circular>
              </div>
              <v-list>
                <v-list-item
                  v-for="factor in riskFactors"
                  :key="factor.name"
                  :prepend-icon="factor.icon"
                  :title="factor.name"
                  :subtitle="factor.description"
                >
                  <template v-slot:append>
                    <v-chip
                      :color="factor.impact === 'positive' ? 'success' : 'error'"
                      size="small"
                    >
                      {{ factor.score }}
                    </v-chip>
                  </template>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Transaction Pattern Analysis -->
      <v-row class="mt-6">
        <v-col cols="12">
          <v-card>
            <v-card-title>Transaction Pattern Analysis</v-card-title>
            <v-card-text>
              <Line
                v-if="chartData.anomalies.datasets.length"
                :data="chartData.anomalies"
                :options="chartOptions.anomalies"
              />
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { Line } from 'vue-chartjs';
import { MLService } from '../services/ml.service';
import axios from 'axios';

const mlService = new MLService();

// Security alerts
const securityAlerts = ref([
  {
    id: 1,
    title: 'Large Transaction Detected',
    description: 'Unusual amount transferred: 50,000 EUR',
    severity: 'high',
    confidence: 95,
    timestamp: '2 hours ago'
  },
  {
    id: 2,
    title: 'Multiple Currency Exchange',
    description: 'Frequent exchanges between USD and EUR',
    severity: 'medium',
    confidence: 75,
    timestamp: '5 hours ago'
  },
  {
    id: 3,
    title: 'New Location Access',
    description: 'Account accessed from new IP address',
    severity: 'medium',
    confidence: 85,
    timestamp: '1 day ago'
  }
]);

// Risk assessment
const riskScore = ref(78);
const riskFactors = ref([
  {
    name: 'Transaction Pattern',
    description: 'Regular spending patterns observed',
    icon: 'mdi-chart-line',
    impact: 'positive',
    score: '+10'
  },
  {
    name: 'Location Consistency',
    description: 'Consistent access locations',
    icon: 'mdi-map-marker',
    impact: 'positive',
    score: '+15'
  },
  {
    name: 'Large Transactions',
    description: 'Recent high-value transfers',
    icon: 'mdi-cash',
    impact: 'negative',
    score: '-8'
  }
]);

// Chart data for anomaly visualization
const chartData = ref({
  anomalies: {
    labels: [],
    datasets: []
  }
});

const chartOptions = {
  anomalies: {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: {
        display: true,
        text: 'Transaction Anomaly Score Over Time'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Anomaly Score'
        }
      }
    }
  }
};

// Helper function to determine risk color
const getRiskColor = (score) => {
  if (score >= 90) return 'success';
  if (score >= 70) return 'warning';
  return 'error';
};

// Initialize chart data with anomaly scores
const initializeAnomalyChart = async () => {
  try {
    // Get recent transactions
    const response = await axios.get('http://localhost:3001/api/transactions', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });

    const transactions = response.data.transactions || [];
    
    // Calculate anomaly scores using ML service
    const scores = await Promise.all(
      transactions.map(async (tx) => {
        const result = await mlService.detectAnomaly(tx, transactions);
        return result.confidence;
      })
    );

    chartData.value.anomalies = {
      labels: transactions.map(tx => new Date(tx.createdAt).toLocaleDateString()),
      datasets: [{
        label: 'Anomaly Score',
        data: scores,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        fill: true
      }]
    };
  } catch (error) {
    console.error('Error initializing anomaly chart:', error);
  }
};

onMounted(async () => {
  await mlService.initialize();
  await initializeAnomalyChart();
});
</script>

<style scoped>
.security-dashboard {
  padding: 20px;
}
</style>
