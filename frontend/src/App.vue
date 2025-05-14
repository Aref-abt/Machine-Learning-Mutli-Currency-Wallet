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
        <div v-if="isLoggedIn" class="d-flex align-center">
          <v-menu>
            <template v-slot:activator="{ props }">
              <v-btn
                class="mr-2"
                v-bind="props"
              >
                <v-avatar size="32" class="mr-2">
                  <v-img
                    v-if="currentUser?.avatar"
                    :src="currentUser.avatar"
                    alt="Profile"
                  />
                  <v-icon v-else>mdi-account-circle</v-icon>
                </v-avatar>
                {{ currentUser?.name || currentUser?.email || 'User' }}
                <v-icon right>mdi-chevron-down</v-icon>
              </v-btn>
            </template>

            <v-list width="200">
              <v-list-item @click="router.push('/profile')">
                <template v-slot:prepend>
                  <v-icon>mdi-account</v-icon>
                </template>
                <v-list-item-title>Profile</v-list-item-title>
              </v-list-item>

              <v-list-item @click="router.push('/security')">
                <template v-slot:prepend>
                  <v-icon>mdi-shield-check</v-icon>
                </template>
                <v-list-item-title>Security</v-list-item-title>
              </v-list-item>

              <v-divider></v-divider>

              <v-list-item @click="handleLogout">
                <template v-slot:prepend>
                  <v-icon>mdi-logout</v-icon>
                </template>
                <v-list-item-title>Logout</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </div>
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
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { AuthService } from './services/auth.service';

const router = useRouter();
const drawer = ref(true);
const currentUser = ref(null);

const menuItems = [
  { title: 'Wallets', path: '/wallet', icon: 'mdi-wallet' },
  { title: 'Exchange', path: '/exchange', icon: 'mdi-currency-usd' },
  { title: 'Receive Money', path: '/transfer', icon: 'mdi-qrcode' },
  { title: 'Check Deposit', path: '/check-deposit', icon: 'mdi-checkbox-marked-circle' },
  { title: 'Analytics', path: '/analytics', icon: 'mdi-chart-box' },
  { title: 'Security', path: '/security', icon: 'mdi-shield-check', highlight: true }
];

const isLoggedIn = computed(() => {
  const token = localStorage.getItem('token');
  return !!token;
});

const handleLogout = () => {
  AuthService.logout();
  router.push('/login');
};

onMounted(() => {
  if (isLoggedIn.value) {
    currentUser.value = AuthService.getCurrentUser();
  }
});

// Watch for route changes to update user info
router.beforeEach((to, from, next) => {
  if (to.matched.some(record => record.meta.requiresAuth)) {
    if (!isLoggedIn.value) {
      next('/login');
    } else {
      currentUser.value = AuthService.getCurrentUser();
      next();
    }
  } else {
    next();
  }
});
</script>
