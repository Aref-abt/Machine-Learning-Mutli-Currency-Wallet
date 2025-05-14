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
        type="article"
      ></v-skeleton-loader>

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
import { ref, computed, onMounted } from 'vue';
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
  return `1 ${fromCurrency.value} = ${rate.toFixed(4)} ${toCurrency.value}`;
};

const formatPercentage = (value) => {
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
};

const formatAmount = (value) => {
  return `${value > 0 ? '+' : ''}${value.toFixed(2)} ${toCurrency.value}`;
};

// Data fetching
const updatePredictions = async () => {
  if (fromCurrency.value === toCurrency.value) return;
  
  loading.value = true;
  try {
    // Fetch historical data (mock for now)
    const historicalData = Array.from({ length: 30 }, (_, i) => {
      return Math.random() * 0.1 + 1; // Mock data between 1.0 and 1.1
    });
    
    prediction.value = await mlService.predictExchangeRate(
      historicalData,
      fromCurrency.value,
      toCurrency.value
    );
  } catch (error) {
    console.error('Failed to update predictions:', error);
  } finally {
    loading.value = false;
  }
};

const refreshPredictions = () => {
  updatePredictions();
};

onMounted(() => {
  updatePredictions();
});
</script>

<style scoped>
.ml-insights {
  max-width: 900px;
  margin: 0 auto;
}
</style>
