<template>
  <v-container class="fill-height">
    <v-row justify="center">
      <v-col cols="12" sm="8" md="6" lg="4">
        <v-card class="elevation-12">
          <v-toolbar color="primary" dark>
            <v-toolbar-title>Register</v-toolbar-title>
          </v-toolbar>
          <v-card-text>
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
                :rules="[
                  v => !!v || 'Password is required',
                  v => v?.length >= 8 || 'Password must be at least 8 characters'
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
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const loading = ref(false);

const handleSubmit = async () => {
  if (!form.value?.validate()) return;
  
  loading.value = true;
  try {
    await AuthService.register(email.value, password.value);
    router.push('/wallet');
  } catch (error) {
    console.error('Registration error:', error);
    alert(error.message || 'Registration failed');
  } finally {
    loading.value = false;
  }
};
</script>
