<template>
  <v-card class="ml-insights">
    <v-card-title class="text-h6">
      ML Exchange Rate Insights
      <v-spacer></v-spacer>
      <v-btn icon @click="refreshPredictions">
        <v-icon>mdi-refresh</v-icon>
      </v-btn>
    </v-card-title>

    <v-card-text>
      <v-row>
        <v-col cols="12" sm="6">
          <v-select
            v-model="fromCurrency"
            :items="currencies"
            label="From Currency"
            @change="updatePredictions"
          ></v-select>
        </v-col>
        <v-col cols="12" sm="6">
          <v-select
            v-model="toCurrency"
            :items="currencies"
            label="To Currency"
            @change="updatePredictions"
          ></v-select>
        </v-col>
      </v-row>

      <v-skeleton-loader
        v-if="loading"
        type="article,text,button"
        :loading="loading"
        class="my-4"
      >
        <template v-slot:default>
          <div class="loading-placeholder">
            <div class="text-h6 mb-4">Loading predictions...</div>
            <v-progress-linear
              indeterminate
              color="primary"
            ></v-progress-linear>
          </div>
        </template>
      </v-skeleton-loader>

      <v-alert
        v-else-if="error"
        type="error"
        text
        class="mb-4"
      >
        {{ error }}
      </v-alert>

      <div v-else-if="prediction">
        <!-- Best Time to Exchange -->
        <v-alert
          color="success"
          icon="mdi-clock-check"
          border="left"
          prominent
        >
          <div class="text-h6">Best Time to Exchange</div>
          <div>
            In {{ prediction.bestTime.day }} day{{ prediction.bestTime.day > 1 ? 's' : '' }}
            ({{ formatDate(prediction.bestTime.day) }})
          </div>
          <div class="mt-2">
            <strong>Expected Rate:</strong> {{ formatRate(prediction.bestTime.rate) }}
            <v-chip
              small
              :color="prediction.bestTime.confidence > 70 ? 'success' : 'warning'"
              class="ml-2"
            >
              {{ Math.round(prediction.bestTime.confidence) }}% confidence
            </v-chip>
          </div>
          <div class="mt-2" v-if="prediction.bestTime.potentialSavings.percentage > 0">
            <strong>Potential Savings:</strong>
            {{ formatPercentage(prediction.bestTime.potentialSavings.percentage) }}
            ({{ formatAmount(prediction.bestTime.potentialSavings.exampleAmount) }} on a 1000 {{ fromCurrency }} transfer)
          </div>
        </v-alert>

        <!-- Rate Predictions Chart -->
        <div class="mt-4">
          <div class="text-h6 mb-2">7-Day Rate Forecast</div>
          <v-chart
            :option="chartOption"
            autoresize
            style="height: 300px"
          />
        </div>
      </div>

      <v-alert
        v-else
        type="info"
        text
      >
        Select currencies to view exchange rate predictions
      </v-alert>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import VChart from 'vue-echarts';
import { MLService } from '../services/ml.service';

use([
  CanvasRenderer,
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent
]);

const mlService = new MLService();
const loading = ref(false);
const prediction = ref(null);
const error = ref(null);
const fromCurrency = ref('USD');
const toCurrency = ref('EUR');
const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'AUD'];

// Chart configuration
const chartOption = computed(() => {
  if (!prediction.value) return {};

  const dates = prediction.value.predictions.map(p => formatDate(p.day));
  const rates = prediction.value.predictions.map(p => p.rate);
  const confidences = prediction.value.predictions.map(p => p.confidence);

  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const rate = params[0].value;
        const confidence = params[1].value;
        return `Date: ${params[0].name}<br/>
                Rate: ${formatRate(rate)}<br/>
                Confidence: ${Math.round(confidence)}%`;
      }
    },
    legend: {
      data: ['Exchange Rate', 'Confidence']
    },
    xAxis: {
      type: 'category',
      data: dates
    },
    yAxis: [
      {
        type: 'value',
        name: 'Exchange Rate',
        position: 'left'
      },
      {
        type: 'value',
        name: 'Confidence',
        position: 'right',
        min: 0,
        max: 100,
        axisLabel: {
          formatter: '{value}%'
        }
      }
    ],
    series: [
      {
        name: 'Exchange Rate',
        type: 'line',
        data: rates,
        smooth: true,
        showSymbol: true,
        symbolSize: 8,
        lineStyle: {
          width: 3
        }
      },
      {
        name: 'Confidence',
        type: 'line',
        yAxisIndex: 1,
        data: confidences,
        smooth: true,
        showSymbol: true,
        symbolSize: 8,
        lineStyle: {
          width: 2,
          type: 'dashed'
        }
      }
    ]
  };
});

// Helper functions
const formatDate = (daysFromNow) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatRate = (rate) => {
  if (rate === undefined || rate === null) return 'N/A';
  return `1 ${fromCurrency.value} = ${Number(rate).toFixed(4)} ${toCurrency.value}`;
};

const formatPercentage = (value) => {
  if (value === undefined || value === null) return 'N/A';
  return `${value > 0 ? '+' : ''}${Number(value).toFixed(2)}%`;
};

const formatAmount = (value) => {
  if (value === undefined || value === null) return 'N/A';
  return `${value > 0 ? '+' : ''}${Number(value).toFixed(2)} ${toCurrency.value}`;
};

// Data fetching
// Track if component is mounted
const isMounted = ref(true);

// Cleanup on unmount
onBeforeUnmount(() => {
  isMounted.value = false;
});

const updatePredictions = async () => {
  if (!isMounted.value) return;
  
  error.value = null;
  loading.value = true;
  prediction.value = null;
  
  if (!fromCurrency.value || !toCurrency.value || fromCurrency.value === toCurrency.value) {
    error.value = 'Please select different currencies';
    loading.value = false;
    return;
  }

  try {
    // Get historical data first
    const historicalData = await mlService.getHistoricalRates(
      fromCurrency.value,
      toCurrency.value
    );

    // Generate initial mock data using latest rate
    const latestRate = historicalData.length > 0 ? 
      historicalData[historicalData.length - 1].rate : 1;

    const mockData = {
      predictions: Array(7).fill(0).map((_, i) => ({
        day: i + 1,
        rate: latestRate * (1 + (Math.random() - 0.5) * 0.02 * (i + 1)),
        confidence: 50
      })),
      bestTime: null,
      fromCurrency: fromCurrency.value,
      toCurrency: toCurrency.value
    };

    // Show mock data immediately
    if (isMounted.value) {
      prediction.value = mockData;
    }

    // Try to get real predictions
    if (historicalData && historicalData.length > 0) {
      const result = await mlService.predictExchangeRate(
        fromCurrency.value,
        toCurrency.value,
        historicalData
      );
      
      if (isMounted.value && result) {
        prediction.value = result;
      }
    } else {
      throw new Error('No historical data available');
    }
  } catch (err) {
    if (isMounted.value) {
      console.warn('Using mock predictions due to error:', err);
      // Keep the mock data visible, just update the error state
      error.value = 'Using estimated rates - ' + (err.message || 'Failed to get real-time predictions');
      
      // Generate fallback mock data if we don't have any predictions yet
      if (!prediction.value) {
        prediction.value = {
          predictions: Array(7).fill(0).map((_, i) => ({
            day: i + 1,
            rate: 1 * (1 + (Math.random() - 0.5) * 0.02 * (i + 1)),
            confidence: 50
          })),
          bestTime: null,
          fromCurrency: fromCurrency.value,
          toCurrency: toCurrency.value
        };
      }
    }
  } finally {
    if (isMounted.value) {
      loading.value = false;
    }
  }
};

const refreshPredictions = () => {
  if (isMounted.value) {
    updatePredictions();
  }
};

onMounted(() => {
  isMounted.value = true;
  updatePredictions();
});

onBeforeUnmount(() => {
  isMounted.value = false;
});
</script>

<style scoped>
.ml-insights {
  max-width: 900px;
  margin: 0 auto;
}
</style>
