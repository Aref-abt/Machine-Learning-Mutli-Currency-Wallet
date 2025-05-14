<template>
  <v-container>
    <v-row>
      <v-col cols="12" md="8" offset-md="2">
        <h1 class="text-h4 mb-4">Profile</h1>

        <v-card>
          <v-card-text>
            <v-form ref="form" @submit.prevent="handleSubmit">
              <v-row>
                <v-col cols="12" md="4" class="text-center">
                  <v-avatar size="150" class="mb-4">
                    <v-img
                      v-if="avatar || user.avatar"
                      :src="avatar || user.avatar"
                      alt="Profile"
                    />
                    <v-icon v-else size="150">mdi-account-circle</v-icon>
                  </v-avatar>
                  
                  <v-file-input
                    v-model="avatarFile"
                    accept="image/*"
                    label="Change Avatar"
                    prepend-icon="mdi-camera"
                    @change="handleAvatarChange"
                  />
                </v-col>

                <v-col cols="12" md="8">
                  <v-text-field
                    v-model="user.name"
                    label="Full Name"
                    required
                    :rules="[v => !!v || 'Name is required']"
                  />

                  <v-text-field
                    v-model="user.email"
                    label="Email"
                    type="email"
                    required
                    :rules="[
                      v => !!v || 'Email is required',
                      v => /.+@.+\..+/.test(v) || 'Email must be valid'
                    ]"
                  />

                  <v-text-field
                    v-model="user.phone"
                    label="Phone Number"
                    type="tel"
                  />

                  <v-select
                    v-model="user.preferredCurrency"
                    :items="availableCurrencies"
                    item-title="title"
                    item-value="value"
                    label="Preferred Currency"
                  />

                  <v-switch
                    v-model="user.notifications"
                    label="Enable Email Notifications"
                    color="primary"
                  />
                </v-col>
              </v-row>

              <v-card-actions>
                <v-spacer />
                <v-btn
                  color="primary"
                  type="submit"
                  :loading="loading"
                >
                  Save Changes
                </v-btn>
              </v-card-actions>
            </v-form>
          </v-card-text>
        </v-card>

        <v-snackbar
          v-model="showSuccess"
          color="success"
          timeout="3000"
        >
          Profile updated successfully!
        </v-snackbar>

        <v-snackbar
          v-model="showError"
          color="error"
          timeout="5000"
        >
          {{ errorMessage }}
        </v-snackbar>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { AuthService } from '../services/auth.service';

const form = ref(null);
const user = ref({
  name: '',
  email: '',
  phone: '',
  avatar: '',
  preferredCurrency: 'USD',
  notifications: true
});

const loading = ref(false);
const showSuccess = ref(false);
const showError = ref(false);
const errorMessage = ref('');
const avatarFile = ref(null);
const avatar = ref(null);

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

const handleAvatarChange = (file) => {
  if (!file) {
    avatar.value = null;
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    avatar.value = e.target.result;
  };
  reader.readAsDataURL(file);
};

const handleSubmit = async () => {
  if (!form.value?.validate()) return;

  loading.value = true;
  try {
    // TODO: Implement API call to update profile
    const formData = new FormData();
    formData.append('name', user.value.name);
    formData.append('email', user.value.email);
    formData.append('phone', user.value.phone);
    formData.append('preferredCurrency', user.value.preferredCurrency);
    formData.append('notifications', user.value.notifications);
    
    if (avatarFile.value) {
      formData.append('avatar', avatarFile.value);
    }

    await AuthService.updateProfile(formData);
    showSuccess.value = true;
  } catch (error) {
    console.error('Profile update error:', error);
    errorMessage.value = error.message === 'Network Error' ? 
      'Cannot connect to server. Please try again later.' : 
      error.message || 'Failed to update profile';
    showError.value = true;
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  const currentUser = AuthService.getCurrentUser();
  if (currentUser) {
    user.value = {
      ...user.value,
      ...currentUser
    };
  }
});
</script>
