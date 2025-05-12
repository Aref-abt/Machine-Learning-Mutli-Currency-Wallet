<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-4">Check Deposit</h1>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>Deposit a Check</v-card-title>
          <v-card-text>
            <v-form ref="form" @submit.prevent="handleDeposit">
              <v-select
                v-model="selectedWallet"
                :items="wallets"
                item-title="currency"
                item-value="id"
                label="Select Wallet"
                required
                :rules="[v => !!v || 'Please select a wallet']"
              />

              <v-text-field
                v-model="amount"
                label="Check Amount"
                type="number"
                required
                prefix="$"
                :rules="[v => !!v || 'Amount is required']"
              />

              <v-file-input
                v-model="checkImage"
                label="Upload Check Image (Optional)"
                accept="image/*"
                prepend-icon="mdi-camera"
                :error-messages="previewError ? [previewError] : []"
                :error="!!previewError"
                :show-size="true"
                hint="Upload a check image (max 5MB)"
                persistent-hint
                @update:model-value="updatePreview"
              />

              <v-card v-if="previewUrl" class="mb-4">
                <v-img
                  :src="previewUrl"
                  height="200"
                  contain
                  class="bg-grey-lighten-2"
                />
              </v-card>

              <v-btn
                color="primary"
                block
                type="submit"
                :loading="loading"
              >
                Deposit Check
              </v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>Recent Deposits</v-card-title>
          <v-card-text>
            <v-list v-if="recentDeposits.length > 0" class="bg-grey-lighten-4">
              <v-list-subheader>Recent Deposits</v-list-subheader>
              <v-list-item
                v-for="deposit in recentDeposits"
                :key="deposit.id"
                :subtitle="deposit.formattedDate"
              >
                <template v-slot:prepend>
                  <v-icon
                    :color="deposit.type === 'check_deposit' ? 'primary' : 'success'"
                    :icon="deposit.type === 'check_deposit' ? 'mdi-file-check' : 'mdi-cash'"
                  />
                </template>
                
                <v-list-item-title>
                  {{ deposit.formattedAmount }}
                </v-list-item-title>
                
                <v-list-item-subtitle>
                  {{ deposit.description || 'Deposit' }}
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
            <v-card-text v-else class="text-center text-grey">
              No recent deposits
            </v-card-text>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-snackbar
      v-model="showSuccess"
      color="success"
      timeout="3000"
    >
      Check deposit successful!
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
import { ref, onMounted, onUnmounted, watch } from 'vue';
import axios from 'axios';

const form = ref(null);
const wallets = ref([]);
const selectedWallet = ref(null);
const amount = ref('');
const checkImage = ref(null);
const loading = ref(false);
const showSuccess = ref(false);
const showError = ref(false);
const errorMessage = ref('');
const recentDeposits = ref([]);
const previewUrl = ref('');

const fetchWallets = async () => {
  try {
    const response = await axios.get('http://localhost:3001/api/wallet', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    wallets.value = response.data.wallets;
  } catch (error) {
    console.error('Error fetching wallets:', error);
    alert('Failed to fetch wallets');
  }
};

const fetchRecentDeposits = async () => {
  try {
    const response = await axios.get('http://localhost:3001/api/check/deposits', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    recentDeposits.value = response.data.deposits.map(deposit => ({
      ...deposit,
      formattedAmount: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: deposit.currency
      }).format(deposit.amount),
      formattedDate: new Date(deposit.createdAt).toLocaleDateString()
    }));
  } catch (error) {
    console.error('Error fetching deposits:', error);
  }
};

const handleDeposit = async () => {
  // Clear any previous errors
  errorMessage.value = '';
  showError.value = false;
  previewError.value = '';

  // Validate amount and wallet
  if (!selectedWallet.value || !amount.value) {
    errorMessage.value = 'Please fill in all required fields';
    showError.value = true;
    return;
  }

  const parsedAmount = parseFloat(amount.value);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    errorMessage.value = 'Please enter a valid amount';
    showError.value = true;
    return;
  }

  // Validate check image if provided
  if (checkImage.value?.[0]) {
    const file = checkImage.value[0];
    if (!file.type.startsWith('image/')) {
      errorMessage.value = 'Please upload a valid image file';
      showError.value = true;
      return;
    }

    if (file.size > 5000000) {
      errorMessage.value = 'Image size should be less than 5MB';
      showError.value = true;
      return;
    }
  }

  loading.value = true;
  try {
    const formData = new FormData();
    formData.append('walletId', selectedWallet.value);
    formData.append('amount', amount.value);
    formData.append('checkImage', checkImage.value[0]);

    const response = await axios.post('http://localhost:3001/api/check/deposit', 
      formData,  
      {
        headers: { 
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data'
        }
      }
    );

    showSuccess.value = true;
    form.value.reset();
    checkImage.value = null;
    previewUrl.value = '';
    previewError.value = '';
    await fetchRecentDeposits();
    await fetchWallets();

    // Update the wallet balance in the list
    const updatedWallet = wallets.value.find(w => w.id === selectedWallet.value);
    if (updatedWallet) {
      updatedWallet.balance = response.data.newBalance;
    }
  } catch (error) {
    console.error('Deposit error:', error);
    errorMessage.value = error.message === 'Network Error' ? 
      'Cannot connect to server. Please try again later.' : 
      error.response?.data?.message || 'Deposit failed';
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

// Watch for file selection to create preview URL
const previewError = ref('');

const updatePreview = () => {
  previewError.value = '';
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
  }
  previewUrl.value = '';

  if (!checkImage.value?.[0]) {
    return;
  }

  const file = checkImage.value[0];
  
  // Validate file type
  if (!file.type.startsWith('image/')) {
    previewError.value = 'Please upload an image file';
    checkImage.value = null;
    return;
  }

  // Validate file size (5MB)
  if (file.size > 5000000) {
    previewError.value = 'Image size should be less than 5MB';
    checkImage.value = null;
    return;
  }

  // Create preview URL
  try {
    const url = URL.createObjectURL(file);
    previewUrl.value = url;
  } catch (error) {
    console.error('Error creating preview:', error);
    previewError.value = 'Could not create image preview';
  }
};

// Clean up preview URL when component is unmounted
onUnmounted(() => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
  }
});

// Update preview when file changes
watch(checkImage, updatePreview, { immediate: true });

onMounted(() => {
  fetchWallets();
  fetchRecentDeposits();
});

// Cleanup preview URL when component is destroyed
onUnmounted(() => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
  }
});
</script>
