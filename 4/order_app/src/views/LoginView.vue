<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { login } from '../services/authService';
import { clearCart } from "../services/cartService.js";

const loginField = ref('');
const password = ref('');
const error = ref(null);
const loading = ref(false);

const router = useRouter()

const handleLogin = async () => {
  clearCart();
  error.value = null;
  loading.value = true;
  try {
    const data = await login({login: loginField.value, password: password.value});
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    router.push('/');
  } catch(err) {
    error.value = err.message || err;
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="container mt-5" style="max-width: 400px;">
    <div class="card shadow p-4">
      <h1 class="text-center mb-4">Login</h1>

      <form @submit.prevent="handleLogin">
        <div class="mb-3">
          <label for="login" class="form-label">Login</label>
          <input
              type="text"
              id="login"
              class="form-control"
              v-model="loginField"
              placeholder="Enter your login"
              required
          />
        </div>

        <div class="mb-3">
          <label for="password" class="form-label">Password</label>
          <input
              type="password"
              id="password"
              class="form-control"
              v-model="password"
              placeholder="Enter your password"
              required
          />
        </div>

        <button type="submit" class="btn btn-success w-100 py-2" :disabled="loading">
          {{ loading ? "Logging in..." : "Login" }}
        </button>

        <div v-if="error" class="alert alert-danger mt-3 text-center mb-0">
          {{ error }}
        </div>
      </form>

      <div class="text-center mt-4 border-top pt-3">
        <span>Don't have an account? </span>
        <router-link to="/register" class="text-decoration-none fw-bold">
          Register here
        </router-link>
      </div>
    </div>
  </div>
</template>