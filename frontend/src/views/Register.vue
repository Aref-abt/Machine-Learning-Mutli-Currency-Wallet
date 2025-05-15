<template>
  <v-container class="fill-height">
    <v-row justify="center">
      <v-col cols="12" sm="8" md="6" lg="4">
        <v-card class="elevation-12">
          <v-toolbar color="primary" dark>
            <v-toolbar-title>Register</v-toolbar-title>
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
                v-model="username"
                label="Username"
                required
                prepend-icon="mdi-account"
                :rules="[v => !!v || 'Username is required']"
              />
              <v-text-field
                v-model="email"
                label="Email"
                type="email"
                required
                prepend-icon="mdi-email"
                :rules="[
                  v => !!v || 'Email is required',
                  v => /.+@.+\..+/.test(v) || 'Email must be valid'
                ]"
              />
              <v-text-field
                v-model="password"
                label="Password"
                type="password"
                required
                prepend-icon="mdi-lock"
                :rules="[
                  v => !!v || 'Password is required',
                  v => (v && v.length >= 8) || 'Password must be at least 8 characters',
                  v => /[A-Z]/.test(v) || 'Password must contain at least one uppercase letter',
                  v => /[0-9]/.test(v) || 'Password must contain at least one number'
                ]"
              />
              <v-text-field
                v-model="confirmPassword"
                label="Confirm Password"
                type="password"
                required
                prepend-icon="mdi-lock-check"
                :rules="[
                  v => !!v || 'Please confirm your password',
                  v => v === password || 'Passwords must match'
                ]"
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
              Register
            </v-btn>
          </v-card-actions>
          <v-card-text class="text-center">
            Already have an account?
            <router-link to="/login">Login</router-link>
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
const username = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const error = ref(null);

const handleSubmit = async () => {
  error.value = null;
  if (!form.value?.validate()) return;
  
  loading.value = true;
  try {
    await AuthService.register({
      username: username.value,
      email: email.value,
      password: password.value
    });
  } catch (err) {
    console.error('Registration error:', err);
    error.value = err.message || 'Registration failed. Please try again.';
  } finally {
    loading.value = false;
  }
};
</script>
