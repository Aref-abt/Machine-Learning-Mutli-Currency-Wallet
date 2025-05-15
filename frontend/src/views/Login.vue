<template>
  <v-container class="fill-height">
    <v-row justify="center">
      <v-col cols="12" sm="8" md="6" lg="4">
        <v-card class="elevation-12">
          <v-toolbar color="primary" dark>
            <v-toolbar-title>Login</v-toolbar-title>
          </v-toolbar>
          <v-card-text>
            <v-alert
              v-if="error"
              type="error"
              variant="tonal"
              closable
              class="mb-4"
              @click:close="error = null"
            >
              {{ error }}
            </v-alert>
            <v-form @submit.prevent="handleSubmit" ref="form">
              <v-text-field
                v-model="email"
                label="Email"
                type="email"
                required
                prepend-icon="mdi-email"
                :rules="[v => !!v || 'Email is required']"
              />
              <v-text-field
                v-model="password"
                label="Password"
                type="password"
                required
                prepend-icon="mdi-lock"
                :rules="[v => !!v || 'Password is required']"
              />
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn
              color="primary"
              @click="handleSubmit"
              :loading="loading"
            >
              Login
            </v-btn>
          </v-card-actions>
          <v-card-text class="text-center">
            Don't have an account?
            <router-link to="/register">Register</router-link>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { AuthService } from '../services/auth.service';

const router = useRouter();
const form = ref(null);
const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref(null);

const handleSubmit = async () => {
  error.value = null;
  if (!form.value?.validate()) return;
  
  loading.value = true;
  try {
    await AuthService.login(email.value, password.value);
  } catch (err) {
    console.error('Login error:', err);
    error.value = err.message || 'Login failed';
  } finally {
    loading.value = false;
  }
};
</script>
