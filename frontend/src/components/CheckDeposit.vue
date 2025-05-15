<template>
  <v-card class="pa-4">
    <v-card-title>Deposit Check</v-card-title>
    
    <v-form @submit.prevent="processDeposit" ref="form">
      <v-text-field
        v-model="checkData.amount"
        label="Check Amount"
        type="number"
        :rules="[v => !!v || 'Amount is required']"
        prefix="$"
      />

      <v-text-field
        v-model="checkData.checkNumber"
        label="Check Number"
        :rules="[v => !!v || 'Check number is required']"
      />

      <v-text-field
        v-model="checkData.routingNumber"
        label="Routing Number"
        :rules="[v => !!v || 'Routing number is required']"
      />

      <v-text-field
        v-model="checkData.accountNumber"
        label="Account Number"
        :rules="[v => !!v || 'Account number is required']"
      />

      <v-select
        v-model="checkData.currency"
        :items="currencies"
        label="Currency"
        :rules="[v => !!v || 'Currency is required']"
      />

      <v-btn
        type="submit"
        color="primary"
        block
        :loading="processing"
      >
        Process Check
      </v-btn>
    </v-form>

    <!-- Recent Deposits -->
    <v-card-title class="mt-4">Recent Deposits</v-card-title>
    <v-list>
      <v-list-item
        v-for="deposit in recentDeposits"
        :key="deposit.id"
      >
        <v-list-item-title>
          {{ deposit.currency }} {{ deposit.amount }}
        </v-list-item-title>
        <v-list-item-subtitle>
          Status: {{ deposit.status }}
        </v-list-item-subtitle>
      </v-list-item>
    </v-list>
  </v-card>
</template>

<script>
import { ref, onMounted } from 'vue';
import checkService from '@/services/check.service';

export default {
  name: 'CheckDeposit',
  
  setup() {
    const form = ref(null);
    const processing = ref(false);
    const recentDeposits = ref([]);

    const checkData = ref({
      amount: '',
      checkNumber: '',
      routingNumber: '',
      accountNumber: '',
      currency: 'USD'
    });

    const currencies = ['USD', 'EUR', 'GBP', 'CAD'];

    const processDeposit = async () => {
      if (!form.value.validate()) return;
      
      processing.value = true;
      try {
        const result = await checkService.processCheckDeposit(checkData.value, 'current-user-id');
        recentDeposits.value.unshift({
          ...checkData.value,
          id: result.depositId,
          status: result.status
        });
        
        // Reset form
        checkData.value = {
          amount: '',
          checkNumber: '',
          routingNumber: '',
          accountNumber: '',
          currency: 'USD'
        };
        form.value.resetValidation();
      } catch (error) {
        console.error('Failed to process check:', error);
      } finally {
        processing.value = false;
      }
    };

    onMounted(() => {
      recentDeposits.value = checkService.getDepositHistory('current-user-id');
    });

    return {
      form,
      checkData,
      currencies,
      processing,
      recentDeposits,
      processDeposit
    };
  }
};
</script>
