<template>
  <v-app>
    <v-navigation-drawer
      v-model="drawer"
      v-if="isLoggedIn"
      temporary
    >
      <v-list>
        <v-list-item
          v-for="item in menuItems"
          :key="item.title"
          :to="item.path"
          :prepend-icon="item.icon"
        >
          <v-list-item-title>{{ item.title }}</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <v-app-bar>
      <template v-slot:prepend>
        <v-app-bar-nav-icon v-if="isLoggedIn" @click="drawer = !drawer" />
      </template>

      <v-app-bar-title>ML Wallet</v-app-bar-title>

      <template v-slot:append>
        <v-btn v-if="isLoggedIn" icon @click="handleLogout">
          <v-icon>mdi-logout</v-icon>
        </v-btn>
      </template>
    </v-app-bar>

    <v-main>
      <router-view />
    </v-main>

    <v-footer app>
      <span>&copy; {{ new Date().getFullYear() }} ML Wallet</span>
    </v-footer>
  </v-app>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const drawer = ref(true);

const menuItems = [
  { title: 'Wallets', path: '/wallet', icon: 'mdi-wallet' },
  { title: 'Exchange', path: '/exchange', icon: 'mdi-currency-usd' },
  { title: 'Transfer', path: '/transfer', icon: 'mdi-bank-transfer' },
  { title: 'Check Deposit', path: '/check-deposit', icon: 'mdi-checkbox-marked-circle' }
];

const isLoggedIn = computed(() => {
  const token = localStorage.getItem('token');
  return !!token;
});

const handleLogout = () => {
  localStorage.removeItem('token');
  router.push('/login');
};
</script>
