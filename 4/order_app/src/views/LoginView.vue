<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { login } from '../services/authService';

const loginField = ref('');
const password = ref('');
const error = ref(null);
const loading = ref(false);

const router = useRouter()

const handleLogin = async () => {
  error.value = null;
  loading.value = true;
  try {
    const data = await login({login: loginField.value, password: password.value});
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    router.push('/');
  } catch(err) {
    error.value = err;
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="container mt-5" style="max-width: 400px;">
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

      <button type="submit" class="btn btn-success w-100" :disabled="loading">
        {{ loading ? "Logging in..." : "Login" }}
      </button>

      <div v-if="error" class="alert alert-danger mt-3 text-center">
        {{ error }}
      </div>
    </form>
  </div>
</template>