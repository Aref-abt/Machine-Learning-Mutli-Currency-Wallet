<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-4">Receive Money</h1>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>Receive Money</v-card-title>
          <v-card-text class="text-center">
            <v-select
              v-model="receiveWallet"
              :items="wallets"
              item-title="currency"
              item-value="id"
              label="Select Wallet for Receiving"
              required
            />

            <div v-if="receiveWallet" class="my-4">
              <v-sheet class="mx-auto pa-4" max-width="300" rounded>
                <qrcode-vue
                  :value="qrValue"
                  :size="200"
                  level="H"
                  class="mx-auto"
                />
              </v-sheet>
              <p class="mt-4 text-body-1">
                Scan this QR code to receive money in your {{ getWalletCurrency(receiveWallet) }} wallet
              </p>
            </div>
          </v-card-text>
        </v-card>

        <v-card class="mt-4">
          <v-card-title>Recent Transfers</v-card-title>
          <v-list>
            <v-list-item
              v-for="transfer in recentTransfers"
              :key="transfer.id"
              :subtitle="new Date(transfer.created_at).toLocaleDateString()"
            >
              <template v-slot:prepend>
                <v-icon :color="transfer.type === 'sent' ? 'error' : 'success'">
                  {{ transfer.type === 'sent' ? 'mdi-arrow-up' : 'mdi-arrow-down' }}
                </v-icon>
              </template>

              <v-list-item-title>
                {{ formatAmount(transfer.amount, transfer.currency) }}
              </v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>
    </v-row>

    <v-snackbar
      v-model="showSuccess"
      color="success"
      timeout="3000"
    >
      Transfer completed successfully!
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import QrcodeVue from 'qrcode.vue';
import axios from 'axios';

// Form refs and data
const form = ref(null);
const wallets = ref([]);
const receiveWallet = ref(null);
const recentTransfers = ref([]);

// UI state
const loading = ref(false);
const showSuccess = ref(false);
const showError = ref(false);
const errorMessage = ref('');

const fetchWallets = async () => {
  try {
    const response = await axios.get('http://localhost:3001/api/wallet', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    wallets.value = response.data.wallets;
  } catch (error) {
    console.error('Error fetching wallets:', error);
  }
};



const fetchRecentTransfers = async () => {
  try {
    const response = await axios.get('http://localhost:3001/api/transfer/history', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    recentTransfers.value = response.data.map(t => ({
      id: t.id,
      amount: t.amount,
      currency: t.currency,
      type: t.type === 'transfer_out' ? 'sent' : 'received',
      created_at: t.createdAt
    }));
  } catch (error) {
    console.error('Error fetching transfers:', error);
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

const qrValue = computed(() => {
  if (!receiveWallet.value) return '';
  const wallet = wallets.value.find(w => w.id === receiveWallet.value);
  return JSON.stringify({
    type: 'wallet_transfer',
    walletId: wallet.id,
    currency: wallet.currency
  });
});



onMounted(() => {
  fetchWallets();
  fetchRecentTransfers();
});
</script>
