<template>
  <v-container>
    <v-row>
      <v-col cols="12" class="d-flex justify-space-between align-center">
        <h1 class="text-h4">My Wallets</h1>
        <v-btn
          color="primary"
          @click="showCreateWalletDialog = true"
        >
          Create Wallet
        </v-btn>
      </v-col>
    </v-row>

    <v-row>
      <v-col v-for="wallet in wallets" :key="wallet.id" cols="12" md="4">
        <v-card class="wallet-card">
          <v-card-title class="d-flex justify-space-between align-center">
            {{ wallet.currency }}
            <v-chip :color="getStatusColor(wallet.balance)">
              {{ formatAmount(wallet.balance, wallet.currency) }}
            </v-chip>
          </v-card-title>

          <v-card-text>
            <v-list>
              <v-list-subheader>Recent Transactions</v-list-subheader>
              <v-list-item v-for="tx in wallet.transactions" :key="tx.id">
                <v-list-item-title>
                  {{ formatTransactionType(tx.type) }}
                </v-list-item-title>
                <v-list-item-subtitle>
                  {{ formatAmount(tx.amount, tx.currency) }}
                  <span class="text-caption">
                    {{ new Date(tx.created_at).toLocaleDateString() }}
                  </span>
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>

          <v-card-actions>
            <v-btn
              color="primary"
              variant="text"
              @click="openDepositDialog(wallet)"
            >
              Deposit
            </v-btn>
            <v-btn
              color="secondary"
              variant="text"
              @click="openWithdrawDialog(wallet)"
            >
              Withdraw
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Deposit Dialog -->
    <v-dialog v-model="showDepositDialog" max-width="500px">
      <v-card>
        <v-card-title>Deposit Funds</v-card-title>
        <v-card-text>
          <v-form ref="depositForm">
            <v-text-field
              v-model="transactionAmount"
              label="Amount"
              type="number"
              :rules="[v => !!v || 'Amount is required']"
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" @click="handleDeposit" :loading="loading">
            Deposit
          </v-btn>
          <v-btn color="error" @click="showDepositDialog = false">
            Cancel
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Withdraw Dialog -->
    <v-dialog v-model="showWithdrawDialog" max-width="500px">
      <v-card>
        <v-card-title>Withdraw Funds</v-card-title>
        <v-card-text>
          <v-form ref="withdrawForm">
            <v-text-field
              v-model="transactionAmount"
              label="Amount"
              type="number"
              :rules="[
                v => !!v || 'Amount is required',
                v => v <= selectedWallet?.balance || 'Insufficient funds'
              ]"
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" @click="handleWithdraw" :loading="loading">
            Withdraw
          </v-btn>
          <v-btn color="error" @click="showWithdrawDialog = false">
            Cancel
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Create Wallet Dialog -->
    <v-dialog v-model="showCreateWalletDialog" max-width="500px">
      <v-card>
        <v-card-title>Create New Wallet</v-card-title>
        <v-card-text>
          <v-form ref="createWalletForm">
            <v-select
              v-model="newWalletCurrency"
              label="Currency"
              :items="availableCurrencies"
              item-title="title"
              item-value="value"
              :rules="[v => !!v || 'Currency is required']"
              hint="Select the currency for your new wallet"
              persistent-hint
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" @click="handleCreateWallet" :loading="loading">
            Create
          </v-btn>
          <v-btn color="error" @click="showCreateWalletDialog = false">
            Cancel
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar
      v-model="showSuccess"
      color="success"
      timeout="3000"
    >
      Wallet created successfully!
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
import { ref, onMounted } from 'vue';
import { WalletService } from '../services/wallet.service';

const wallets = ref([]);
const showDepositDialog = ref(false);
const showWithdrawDialog = ref(false);
const showCreateWalletDialog = ref(false);
const selectedWallet = ref(null);
const transactionAmount = ref('');
const showSuccess = ref(false);
const showError = ref(false);
const errorMessage = ref('');
const loading = ref(false);
const depositForm = ref(null);
const withdrawForm = ref(null);
const createWalletForm = ref(null);
const newWalletCurrency = ref('');

const availableCurrencies = [
  { title: 'US Dollar', value: 'USD' },
  { title: 'Euro', value: 'EUR' },
  { title: 'British Pound', value: 'GBP' },
  { title: 'Japanese Yen', value: 'JPY' },
  { title: 'Australian Dollar', value: 'AUD' },
  { title: 'Canadian Dollar', value: 'CAD' },
  { title: 'Swiss Franc', value: 'CHF' },
  { title: 'Chinese Yuan', value: 'CNY' }
];

const fetchWallets = async () => {
  try {
    const response = await WalletService.getWallets();
    wallets.value = response.wallets;
  } catch (error) {
    console.error('Error fetching wallets:', error);
    errorMessage.value = error.message === 'Network Error' ? 
      'Cannot connect to server. Please try again later.' : 
      error.message || 'Failed to fetch wallets';
    showError.value = true;
  }
};

const openDepositDialog = (wallet) => {
  selectedWallet.value = wallet;
  transactionAmount.value = '';
  showDepositDialog.value = true;
};

const openWithdrawDialog = (wallet) => {
  selectedWallet.value = wallet;
  transactionAmount.value = '';
  showWithdrawDialog.value = true;
};

const handleDeposit = async () => {
  if (!depositForm.value?.validate()) return;
  
  loading.value = true;
  try {
    await WalletService.createTransaction(
      selectedWallet.value.id,
      'deposit',
      transactionAmount.value,
      selectedWallet.value.currency
    );

    showDepositDialog.value = false;
    showSuccess.value = true;
    await fetchWallets();
  } catch (error) {
    console.error('Deposit error:', error);
    errorMessage.value = error.message === 'Network Error' ? 
      'Cannot connect to server. Please try again later.' : 
      error.message || 'Deposit failed';
    showError.value = true;
  } finally {
    loading.value = false;
  }
};

const handleWithdraw = async () => {
  if (!withdrawForm.value?.validate()) return;
  
  loading.value = true;
  try {
    await WalletService.createTransaction(
      selectedWallet.value.id,
      'withdrawal',
      transactionAmount.value,
      selectedWallet.value.currency
    );

    showWithdrawDialog.value = false;
    showSuccess.value = true;
    await fetchWallets();
  } catch (error) {
    console.error('Withdrawal error:', error);
    errorMessage.value = error.message === 'Network Error' ? 
      'Cannot connect to server. Please try again later.' : 
      error.message || 'Withdrawal failed';
    showError.value = true;
  } finally {
    loading.value = false;
  }
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

const formatTransactionType = (type) => {
  return type.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

const getStatusColor = (balance) => {
  return parseFloat(balance) > 0 ? 'success' : 'error';
};

const handleCreateWallet = async () => {
  if (!createWalletForm.value?.validate()) return;
  
  loading.value = true;
  try {
    await WalletService.createWallet(newWalletCurrency.value);

    showCreateWalletDialog.value = false;
    fetchWallets();
  } catch (error) {
    console.error('Create wallet error:', error);
    errorMessage.value = error.message === 'Network Error' ? 
      'Cannot connect to server. Please try again later.' : 
      error.message || 'Failed to create wallet';
    showError.value = true;
  } finally {
    loading.value = false;
  }
};

onMounted(fetchWallets);
</script>

<style scoped>
.wallet-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.v-card-text {
  flex-grow: 1;
}
</style>
