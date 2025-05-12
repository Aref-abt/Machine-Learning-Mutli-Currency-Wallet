<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-4">Transfer Money</h1>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>Send Money</v-card-title>
          <v-card-text>
            <v-form ref="form" @submit.prevent="handleTransfer">
              <v-select
                v-model="selectedWallet"
                :items="wallets"
                label="Select Wallet"
                :item-title="item => `${item.currency} - ${formatAmount(item.balance, item.currency)}`"
                item-value="id"
                required
                :rules="[v => !!v || 'Please select a wallet']"
                :loading="loading"
                :disabled="loading"
                return-object
              />

              <v-text-field
                v-model="toWalletId"
                label="Recipient Wallet ID"
                required
                :rules="[
                  v => !!v || 'Recipient wallet ID is required',
                  v => !v || v !== selectedWallet.value?.id || 'Cannot transfer to the same wallet'
                ]"
                hint="Enter the wallet ID from recipient's QR code"
                persistent-hint
              />

              <v-text-field
                v-model="amount"
                label="Amount"
                type="number"
                required
                :rules="amountRules"
                :hint="balanceHint"
                persistent-hint
              />

              <v-textarea
                v-model="note"
                label="Note (optional)"
                rows="2"
              />

              <v-btn
                color="primary"
                block
                type="submit"
                :loading="loading"
                :disabled="loading || !isFormValid"
              >
                Send Money
              </v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>

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

const form = ref(null);
const wallets = ref([]);
const selectedWallet = ref(null);
const receiveWallet = ref(null);
const toWalletId = ref('');
const amount = ref('');
const note = ref('');
const loading = ref(false);
const showSuccess = ref(false);
const recentTransfers = ref([]);
const errorMessage = ref('');
const showError = ref(false);

const balanceHint = computed(() => {
  if (!selectedWallet.value) return '';
  return `Available: ${formatAmount(selectedWallet.value.balance, selectedWallet.value.currency)}`;
});

const amountRules = computed(() => [
  v => !!v || 'Amount is required',
  v => !v || parseFloat(v) > 0 || 'Amount must be greater than 0',
  v => {
    if (!v || !selectedWallet.value) return true;
    const parsedAmount = parseFloat(v);
    const balance = parseFloat(selectedWallet.value.balance);
    return parsedAmount <= balance || 
      `Insufficient balance. Available: ${formatAmount(balance, selectedWallet.value.currency)}`;
  }
]);

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

const isFormValid = computed(() => {
  return !!selectedWallet.value && !!toWalletId.value && !!amount.value;
});

const handleTransfer = async () => {
  if (!form.value?.validate()) return;

  if (!isFormValid.value) {
    errorMessage.value = 'Please fill in all required fields';
    showError.value = true;
    return;
  }

  // Validate amount
  const parsedAmount = parseFloat(amount.value);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    errorMessage.value = 'Please enter a valid amount';
    showError.value = true;
    return;
  }

  // Check balance
  if (parsedAmount > selectedWallet.value.balance) {
    errorMessage.value = `Insufficient balance. Available: ${formatAmount(selectedWallet.value.balance, selectedWallet.value.currency)}`;
    showError.value = true;
    return;
  }

  // Check if trying to transfer to same wallet
  if (toWalletId.value === selectedWallet.value.id) {
    errorMessage.value = 'Cannot transfer to the same wallet';
    showError.value = true;
    return;
  }

  loading.value = true;
  try {
    const response = await axios.post('http://localhost:3001/api/transfer', {
      fromWalletId: selectedWallet.value.id,
      toWalletId: toWalletId.value,
      amount: parsedAmount
    }, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });

    // Update wallet balance
    if (response.data.newBalance !== undefined) {
      selectedWallet.value.balance = response.data.newBalance;
    }

    showSuccess.value = true;
    form.value.reset();
    selectedWallet.value = null;
    toWalletId.value = '';
    amount.value = '';
    await fetchWallets(); // Refresh wallets to get updated balances
  } catch (error) {
    console.error('Transfer error:', error);
    errorMessage.value = error.response?.data?.message || 'Transfer failed';
    showError.value = true;
  } finally {
    loading.value = false;
  }
};

const fetchRecentTransfers = async () => {
  try {
    const response = await axios.get('http://localhost:3001/api/transfer/history', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    recentTransfers.value = response.data.transfers;
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

const isTransferValid = computed(() => {
  return selectedWallet.value && 
         recipientEmail.value && 
         amount.value > 0 && 
         amount.value <= getWalletBalance(selectedWallet.value);
});

onMounted(() => {
  fetchWallets();
  fetchRecentTransfers();
});
</script>
