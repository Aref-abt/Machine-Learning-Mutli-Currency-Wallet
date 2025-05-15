<template>
  <v-card class="pa-4">
    <v-card-title class="d-flex justify-space-between align-center">
      Deposit Check
      <v-chip
        v-if="depositStatus"
        :color="getStatusColor(depositStatus)"
      >
        {{ formatStatus(depositStatus) }}
      </v-chip>
    </v-card-title>
    
    <v-form @submit.prevent="processDeposit" ref="form">
      <v-row>
        <v-col cols="12" md="6">
          <v-text-field
            v-model="checkData.amount"
            label="Check Amount*"
            type="number"
            :rules="amountRules"
            prefix="$"
            @input="validateAmount"
          />

          <v-text-field
            v-model="checkData.checkNumber"
            label="Check Number*"
            :rules="checkNumberRules"
            hint="Usually found in the top right corner"
            persistent-hint
          />

          <v-text-field
            v-model="checkData.payeeName"
            label="Payee Name*"
            :rules="[v => !!v || 'Payee name is required']"
            hint="Name on the check"
            persistent-hint
          />

          <v-text-field
            v-model="checkData.bankName"
            label="Bank Name*"
            :rules="[v => !!v || 'Bank name is required']"
          />
        </v-col>

        <v-col cols="12" md="6">
          <v-text-field
            v-model="checkData.routingNumber"
            label="Routing Number*"
            :rules="routingNumberRules"
            maxlength="9"
            hint="9-digit number at the bottom of check"
            persistent-hint
            @input="validateRoutingNumber"
          />

          <v-text-field
            v-model="checkData.accountNumber"
            label="Account Number*"
            :rules="accountNumberRules"
            hint="Usually 10-12 digits after routing number"
            persistent-hint
          />

          <v-menu
            ref="checkDateMenu"
            v-model="checkDateMenu"
            :close-on-content-click="false"
            transition="scale-transition"
            offset-y
            min-width="auto"
          >
            <template v-slot:activator="{ on, attrs }">
              <v-text-field
                v-model="checkData.checkDate"
                label="Check Date*"
                readonly
                v-bind="attrs"
                v-on="on"
                :rules="[v => !!v || 'Check date is required']"
              />
            </template>
            <v-date-picker
              v-model="checkData.checkDate"
              :max="maxDate"
              @input="checkDateMenu = false"
            />
          </v-menu>

          <v-select
            v-model="checkData.currency"
            :items="currencies"
            label="Currency*"
            :rules="[v => !!v || 'Currency is required']"
          />
        </v-col>
      </v-row>

      <v-divider class="my-4"/>

      <!-- Risk Assessment Preview -->
      <v-expand-transition>
        <div v-if="riskAssessment">
          <v-alert
            :color="getRiskColor(riskAssessment.riskScore)"
            border="left"
            colored-border
            class="mb-4"
          >
            <div class="text-subtitle-1 mb-2">
              Risk Assessment
            </div>
            <v-row>
              <v-col cols="6">
                <div class="text-caption">Risk Score</div>
                <div class="text-h6">
                  {{ riskAssessment.riskScore }}/100
                </div>
              </v-col>
              <v-col cols="6">
                <div class="text-caption">Hold Duration</div>
                <div class="text-h6">
                  {{ formatHoldDuration(riskAssessment.holdDuration) }}
                </div>
              </v-col>
            </v-row>
            <div class="text-body-2 mt-2">
              {{ riskAssessment.message }}
            </div>
          </v-alert>
        </div>
      </v-expand-transition>

      <v-btn
        v-if="!riskAssessment"
        color="primary"
        block
        :loading="processing"
        @click="validateCheck"
      >
        Validate Check
      </v-btn>

      <div v-else class="d-flex gap-4">
        <v-btn
          color="success"
          block
          :loading="processing"
          @click="processDeposit"
        >
          Confirm Deposit
        </v-btn>
        <v-btn
          color="error"
          block
          text
          @click="resetForm"
        >
          Cancel
        </v-btn>
      </div>
    </v-form>

    <!-- Recent Deposits -->
    <v-card-title class="mt-4">Recent Deposits</v-card-title>
    <v-list>
      <v-list-item
        v-for="deposit in recentDeposits"
        :key="deposit.id"
        :class="{'grey lighten-4': deposit.status === 'pending_verification'}"
      >
        <v-list-item-content>
          <v-list-item-title class="d-flex justify-space-between">
            <span>{{ formatAmount(deposit.amount, deposit.currency) }}</span>
            <v-chip
              x-small
              :color="getStatusColor(deposit.status)"
            >
              {{ formatStatus(deposit.status) }}
            </v-chip>
          </v-list-item-title>
          <v-list-item-subtitle class="d-flex justify-space-between">
            <span>{{ formatDate(deposit.depositDate) }}</span>
            <span class="text-caption">{{ deposit.bankName }}</span>
          </v-list-item-subtitle>
        </v-list-item-content>
      </v-list-item>
    </v-list>
  </v-card>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import checkService from '@/services/check.service';

export default {
  name: 'CheckDeposit',
  
  setup() {
    const form = ref(null);
    const processing = ref(false);
    const recentDeposits = ref([]);
    const riskAssessment = ref(null);
    const depositStatus = ref(null);
    const checkDateMenu = ref(false);

    const checkData = ref({
      amount: '',
      checkNumber: '',
      routingNumber: '',
      accountNumber: '',
      bankName: '',
      payeeName: '',
      checkDate: new Date().toISOString().substr(0, 10),
      currency: 'USD'
    });

    const currencies = ['USD', 'EUR', 'GBP', 'CAD'];

    const maxDate = new Date().toISOString().substr(0, 10);

    // Validation rules
    const amountRules = [
      v => !!v || 'Amount is required',
      v => v > 0 || 'Amount must be greater than 0',
      v => v <= 50000 || 'Amount exceeds maximum limit of $50,000'
    ];

    const checkNumberRules = [
      v => !!v || 'Check number is required',
      v => /^\d{4,10}$/.test(v) || 'Check number must be 4-10 digits'
    ];

    const routingNumberRules = [
      v => !!v || 'Routing number is required',
      v => /^\d{9}$/.test(v) || 'Must be exactly 9 digits',
      v => validateRoutingNumber(v) || 'Invalid routing number'
    ];

    const accountNumberRules = [
      v => !!v || 'Account number is required',
      v => v.length >= 10 && v.length <= 12 || 'Account number must be 10-12 digits'
    ];

    const validateCheck = async () => {
      try {
        processing.value = true;
        const validationResult = await checkService.validateCheck({
          ...checkData.value,
          walletId: 'current-user-id'
        });
        riskAssessment.value = validationResult;
      } catch (error) {
        console.error(error);
      } finally {
        processing.value = false;
      }
    };

    const processDeposit = async () => {
      try {
        processing.value = true;
        const formData = new FormData();
        Object.entries(checkData.value).forEach(([key, value]) => {
          formData.append(key, value);
        });
        formData.append('walletId', 'current-user-id');
        const result = await checkService.depositCheck(formData);
        console.log(`Check deposit ${result.status}`);
        resetForm();
      } catch (error) {
        console.error(error);
      } finally {
        processing.value = false;
      }
    };

    const resetForm = () => {
      checkData.value = {
        amount: '',
        checkNumber: '',
        routingNumber: '',
        accountNumber: '',
        bankName: '',
        payeeName: '',
        checkDate: new Date().toISOString().substr(0, 10),
        currency: 'USD'
      };
      riskAssessment.value = null;
    };

    const getStatusColor = (status) => {
      const colors = {
        pending_verification: 'warning',
        verified: 'success',
        on_hold: 'grey'
      };
      return colors[status] || 'grey';
    };

    const getRiskColor = (score) => {
      if (score >= 70) return 'error';
      if (score >= 40) return 'warning';
      return 'success';
    };

    const formatStatus = (status) => {
      return status
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    };

    const formatAmount = (amount, currency) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency || 'USD'
      }).format(amount);
    };

    const formatDate = (date) => {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    };

    const formatHoldDuration = (hours) => {
      const days = Math.ceil(hours / 24);
      return `${days} ${days === 1 ? 'day' : 'days'}`;
    };

    onMounted(() => {
      recentDeposits.value = checkService.getDepositHistory('current-user-id');
    });

    return {
      form,
      checkData,
      checkDateMenu,
      maxDate,
      currencies,
      processing,
      recentDeposits,
      riskAssessment,
      depositStatus,
      amountRules,
      checkNumberRules,
      routingNumberRules,
      accountNumberRules,
      validateCheck,
      processDeposit,
      resetForm,
      validateAmount,
      getStatusColor,
      getRiskColor,
      formatStatus,
      formatAmount,
      formatDate,
      formatHoldDuration
    };
  }
};
</script>

<style scoped>
.gap-4 {
  gap: 1rem;
}

.wallet-address {
  font-family: monospace;
  cursor: pointer;
  color: primary;
  font-size: 0.85rem;
  &:hover {
    text-decoration: underline;
  }
}

.v-list-item.grey.lighten-4 {
  border-left: 4px solid var(--v-warning-base);
}
</style>
