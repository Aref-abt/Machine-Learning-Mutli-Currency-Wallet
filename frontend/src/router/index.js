import { createRouter, createWebHistory } from 'vue-router';
import Login from '../views/Login.vue';
import Register from '../views/Register.vue';
import Wallet from '../views/Wallet.vue';
import Exchange from '../views/Exchange.vue';
import Transfer from '../views/Transfer.vue';
import CheckDeposit from '../views/CheckDeposit.vue';

const routes = [
  {
    path: '/',
    redirect: '/wallet'
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { requiresGuest: true }
  },
  {
    path: '/register',
    name: 'Register',
    component: Register,
    meta: { requiresGuest: true }
  },
  {
    path: '/wallet',
    name: 'Wallet',
    component: Wallet,
    meta: { requiresAuth: true }
  },
  {
    path: '/exchange',
    name: 'Exchange',
    component: Exchange,
    meta: { requiresAuth: true }
  },
  {
    path: '/transfer',
    name: 'Transfer',
    component: Transfer,
    meta: { requiresAuth: true }
  },
  {
    path: '/check-deposit',
    name: 'CheckDeposit',
    component: CheckDeposit,
    meta: { requiresAuth: true }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Navigation guard for protected routes
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token');
  const isAuthenticated = !!token;

  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login');
  } else if (to.meta.requiresGuest && isAuthenticated) {
    next('/wallet');
  } else {
    next();
  }
});

export default router;
