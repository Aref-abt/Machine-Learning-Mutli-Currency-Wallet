<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-4">Currency Exchange</h1>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="8">
        <v-card>
          <v-card-title>Exchange Currencies</v-card-title>
          <v-card-text>
            <v-form ref="form" @submit.prevent="handleExchange">
              <v-row>
                <v-col cols="12" md="6">
                  <v-select
                    v-model="fromWallet"
                    :items="wallets"
                    item-title="currency"
                    item-value="id"
                    label="From Currency"
                    required
                    :rules="[v => !!v || 'Please select source currency']"
                  >
                    <template v-slot:item="{ props, item }">
                      <v-list-item v-bind="props">
                        <template v-slot:prepend>
                          {{ item.raw.currency }}
                        </template>
                        <template v-slot:title>
                          {{ formatAmount(item.raw.balance, item.raw.currency) }}
                        </template>
                      </v-list-item>
                    </template>
                  </v-select>
                </v-col>

                <v-col cols="12" md="6">
                  <v-select
                    v-model="toWallet"
                    :items="wallets.filter(w => w.id !== fromWallet)"
                    item-title="currency"
                    item-value="id"
                    label="To Currency"
                    required
                    :rules="[v => !!v || 'Please select target currency']"
                  >
                    <template v-slot:item="{ props, item }">
                      <v-list-item v-bind="props">
                        <template v-slot:prepend>
                          {{ item.raw.currency }}
                        </template>
                        <template v-slot:title>
                          {{ formatAmount(item.raw.balance, item.raw.currency) }}
                        </template>
                      </v-list-item>
                    </template>
                  </v-select>
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="amount"
                    label="Amount"
                    type="number"
                    required
                    :rules="[
                      v => !!v || 'Amount is required',
                      v => v > 0 || 'Amount must be greater than 0',
                      v => v <= getWalletBalance(fromWallet) || 'Insufficient funds'
                    ]"
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    :value="calculateExchangeAmount"
                    label="You'll Receive"
                    readonly
                    :prefix="getWalletCurrency(toWallet)"
                  />
                </v-col>
              </v-row>

              <v-alert
                v-if="exchangeRate"
                color="info"
                icon="mdi-information"
                density="compact"
              >
                Exchange Rate: 1 {{ getWalletCurrency(fromWallet) }} = 
                {{ exchangeRate }} {{ getWalletCurrency(toWallet) }}
              </v-alert>

              <v-btn
                color="primary"
                block
                type="submit"
                :loading="loading"
                :disabled="!isExchangeValid"
              >
                Exchange
              </v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card>
          <v-card-title>Current Rates</v-card-title>
          <v-card-text>
            <v-list>
              <v-list-item
                v-for="(rates, from) in exchangeRates"
                :key="from"
              >
                <v-list-item-title class="text-subtitle-1 font-weight-bold">
                  {{ from }}
                </v-list-item-title>
                <v-list-item-subtitle>
                  <div v-for="(rate, to) in rates" :key="to">
                    1 {{ from }} = {{ rate }} {{ to }}
                  </div>
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-snackbar
      v-model="showSuccess"
      color="success"
      timeout="3000"
    >
      Exchange completed successfully!
    </v-snackbar>

    <v-snackbar
      v-model="showError"
      color="error"
      timeout="5000"
    >
      {{ errorMessage }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import axios from 'axios';

const form = ref(null);
const wallets = ref([]);
const fromWallet = ref(null);
const toWallet = ref(null);
const amount = ref('');
const loading = ref(false);
const showSuccess = ref(false);
const showError = ref(false);
const errorMessage = ref('');
const exchangeRates = ref({});
const exchangeRate = ref(null);

const fetchWallets = async () => {
  try {
    const response = await axios.get('http://localhost:3001/api/wallet', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    wallets.value = response.data.wallets;
  } catch (error) {
    console.error('Error fetching wallets:', error);
    errorMessage.value = error.message === 'Network Error' ? 
      'Cannot connect to server. Please try again later.' : 
      'Failed to fetch wallets';
    showError.value = true;
  }
};

const fetchExchangeRates = async () => {
  try {
    const response = await axios.get('http://localhost:3001/api/exchange/rates', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    exchangeRates.value = response.data.rates;
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    errorMessage.value = error.message === 'Network Error' ? 
      'Cannot connect to server. Please try again later.' : 
      'Failed to fetch exchange rates';
    showError.value = true;
  }
};

const handleExchange = async () => {
  if (!form.value?.validate()) return;
  if (!exchangeRate.value) {
    errorMessage.value = 'Exchange rate not available';
    showError.value = true;
    return;
  }

  const parsedAmount = parseFloat(amount.value);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    errorMessage.value = 'Please enter a valid amount';
    showError.value = true;
    return;
  }

  const balance = getWalletBalance(fromWallet.value);
  if (parsedAmount > balance) {
    errorMessage.value = `Insufficient funds. Available balance: ${formatAmount(balance, getWalletCurrency(fromWallet.value))}`;
    showError.value = true;
    return;
  }

  loading.value = true;
  try {
    await axios.post('http://localhost:3001/api/exchange/execute',
      {
        fromWalletId: fromWallet.value,
        toWalletId: toWallet.value,
        amount: parsedAmount.toString()
      },
      {
        headers: { 
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      }
    );

    showSuccess.value = true;
    form.value.reset();
    fromWallet.value = null;
    toWallet.value = null;
    amount.value = '';
    await fetchWallets();
    await fetchExchangeRates();
  } catch (error) {
    console.error('Exchange error:', error);
    errorMessage.value = error.message === 'Network Error' ? 
      'Cannot connect to server. Please try again later.' : 
      error.response?.data?.message || 'Exchange failed';
    showError.value = true;
  } finally {
    loading.value = false;
  }
};

const getWalletBalance = (walletId) => {
  const wallet = wallets.value.find(w => w.id === walletId);
  return wallet ? parseFloat(wallet.balance) : 0;
};

const getWalletCurrency = (walletId) => {
  const wallet = wallets.value.find(w => w.id === walletId);
  return wallet ? wallet.currency : '';
};

const updateExchangeRate = () => {
  if (fromWallet.value && toWallet.value) {
    const fromCurrency = getWalletCurrency(fromWallet.value);
    const toCurrency = getWalletCurrency(toWallet.value);
    if (!exchangeRates.value[fromCurrency] || !exchangeRates.value[fromCurrency][toCurrency]) {
      errorMessage.value = `Exchange rate not available for ${fromCurrency} to ${toCurrency}`;
      showError.value = true;
      exchangeRate.value = null;
      return;
    }
    exchangeRate.value = exchangeRates.value[fromCurrency][toCurrency];
  } else {
    exchangeRate.value = null;
  }
};

const calculateExchangeAmount = computed(() => {
  if (!amount.value || !exchangeRate.value) return '';
  try {
    const parsedAmount = parseFloat(amount.value);
    if (isNaN(parsedAmount)) {
      errorMessage.value = 'Invalid amount';
      showError.value = true;
      return '';
    }
    const result = (parsedAmount * exchangeRate.value).toFixed(2);
    return result;
  } catch (error) {
    console.error('Error calculating exchange amount:', error);
    errorMessage.value = 'Error calculating exchange amount';
    showError.value = true;
    return '';
  }
});

const isExchangeValid = computed(() => {
  const balance = getWalletBalance(fromWallet.value);
  const parsedAmount = parseFloat(amount.value);
  return fromWallet.value && 
         toWallet.value && 
         !isNaN(parsedAmount) &&
         parsedAmount > 0 && 
         parsedAmount <= balance &&
         exchangeRate.value !== null;
});

const formatAmount = (amount, currency) => {
  if (!currency) return amount;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount);
  } catch (error) {
    return `${amount} ${currency}`;
  }
};

// Watch for wallet changes to update exchange rate
watch([fromWallet, toWallet], updateExchangeRate, { immediate: true });

// Watch for successful exchange to refresh wallets
watch(showSuccess, (newValue) => {
  if (newValue) {
    fetchWallets();
    fetchExchangeRates();
  }
});

onMounted(() => {
  fetchWallets();
  fetchExchangeRates();
});
</script>
