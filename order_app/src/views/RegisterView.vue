<script setup>
import { ref } from 'vue';
import { register } from '../services/authService.js';

const loginField = ref('');
const passwordField = ref('');
const usernameField = ref('');
const emailField = ref('');
const phoneField = ref('');

const error = ref(null);
const successMess = ref(null);
const loading = ref(false);

const handleRegister = async () => {
  error.value = null;
  successMess.value = null;
  loading.value = true;

  try {
    await register({
      login: loginField.value,
      password: passwordField.value,
      username: usernameField.value,
      email: emailField.value,
      phone: phoneField.value,
    });

    successMess.value = "Account created successfully!";

    loginField.value = '';
    passwordField.value = '';
    usernameField.value = '';
    emailField.value = '';
    phoneField.value = '';

  } catch (err) {
    error.value = err.message || err;
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="container mt-5 animate-in" style="max-width: 450px;">
    <div class="card shadow border-0 p-4">
      <h1 class="text-center mb-4 fw-bold">Registration</h1>

      <div v-if="successMess" class="text-center py-4">
        <div class="mb-4">
          <i class="bi bi-person-check-fill text-success" style="font-size: 4rem;"></i>
        </div>
        <h2 class="fw-bold text-success mb-2">{{ successMess }}</h2>
        <p class="text-muted mb-4">You can now use your credentials to access the platform.</p>
        <router-link to="/login" class="btn btn-success fw-bold w-100 py-2 shadow-sm">
          Go to Login page
        </router-link>
      </div>

      <form v-if="!successMess" @submit.prevent="handleRegister">
        <div class="mb-3">
          <label for="reg-login" class="form-label fw-bold">Login</label>
          <input
              type="text"
              id="reg-login"
              class="form-control shadow-sm"
              v-model="loginField"
              placeholder="Choose your login"
              required
          />
        </div>

        <div class="mb-3">
          <label for="reg-password" class="form-label fw-bold">Password</label>
          <input
              type="password"
              id="reg-password"
              class="form-control shadow-sm"
              v-model="passwordField"
              placeholder="Create a strong password"
              required
          />
        </div>

        <div class="mb-3">
          <label for="reg-username" class="form-label fw-bold">Displayed username</label>
          <input
              type="text"
              id="reg-username"
              class="form-control shadow-sm"
              v-model="usernameField"
              placeholder="How do you want to be referred as in your profile?"
              required
          />
        </div>

        <div class="row">
          <div class="col-md-6 mb-3">
            <label for="reg-email" class="form-label fw-bold">Email</label>
            <input
                type="email"
                id="reg-email"
                class="form-control shadow-sm"
                v-model="emailField"
                placeholder="example@mail.com"
                required
            />
          </div>
          <div class="col-md-6 mb-3">
            <label for="reg-phone" class="form-label fw-bold">Phone</label>
            <input
                type="text"
                id="reg-phone"
                class="form-control shadow-sm"
                v-model="phoneField"
                placeholder="XXX-XXX-XXX"
            />
          </div>
        </div>

        <button type="submit" class="btn btn-primary w-100 py-2 mt-2 fw-bold shadow-sm" :disabled="loading">
          <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
          {{ loading ? "Creating account..." : "Register" }}
        </button>

        <Transition name="fade">
          <div v-if="error" class="alert alert-danger mt-3 mb-0 text-center shadow-sm">
            {{ error }}
          </div>
        </Transition>

        <div class="text-center mt-4 border-top pt-3">
          <span class="text-muted">Already have an account? </span>
          <router-link to="/login" class="text-decoration-none fw-bold">Login</router-link>
        </div>
      </form>
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

.btn-primary {
  transition: transform 0.2s;
}

.btn-primary:active {
  transform: scale(0.98);
}
</style>