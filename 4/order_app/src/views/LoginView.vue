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
  <div class="container mt-5 animate-in" style="max-width: 400px;">
    <div class="card shadow border-0 p-4">
      <div class="text-center mb-4">
        <i class="bi bi-shield-lock-fill text-success" style="font-size: 3rem;"></i>
        <h1 class="fw-bold mt-2">Login</h1>
      </div>

      <form @submit.prevent="handleLogin">
        <div class="mb-3">
          <label for="login" class="form-label fw-bold">Login</label>
          <input
              type="text"
              id="login"
              class="form-control shadow-sm"
              v-model="loginField"
              placeholder="Enter your login"
              required
          />
        </div>

        <div class="mb-3">
          <label for="password" class="form-label fw-bold">Password</label>
          <input
              type="password"
              id="password"
              class="form-control shadow-sm"
              v-model="password"
              placeholder="Enter your password"
              required
          />
        </div>

        <button type="submit" class="btn btn-success w-100 py-2 mt-2 fw-bold shadow-sm" :disabled="loading">
          <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
          {{ loading ? "Logging in..." : "Login" }}
        </button>

        <Transition name="fade">
          <div v-if="error" class="alert alert-danger mt-3 text-center mb-0 shadow-sm">
            {{ error }}
          </div>
        </Transition>
      </form>

      <div class="text-center mt-4 border-top pt-3">
        <span class="text-muted">Don't have an account? </span>
        <router-link to="/register" class="text-decoration-none fw-bold">
          Register here
        </router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-in {
  animation: slideUp 0.6s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.btn-success {
  transition: transform 0.2s;
}

.btn-success:active {
  transform: scale(0.98);
}
</style>