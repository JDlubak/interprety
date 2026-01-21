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

    successMess.value = "Account created successfully. You can login now.";

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
  <div class="container mt-5" style="max-width: 450px;">
    <div class="card shadow p-4">
      <h1 class="text-center mb-4">Registration</h1>

      <div v-if="successMess" class="alert alert-success mt-3 text-center border-2">
        <p class="mb-3 fw-bold">{{ successMess }}</p>
        <router-link to="/login" class="btn btn-success fw-bold w-100">
          Go to Login page
        </router-link>
      </div>

      <form v-if="!successMess" @submit.prevent="handleRegister">
        <div class="mb-3">
          <label for="reg-login" class="form-label">Login</label>
          <input
              type="text"
              id="reg-login"
              class="form-control"
              v-model="loginField"
              placeholder="Choose your login"
              required
          />
        </div>

        <div class="mb-3">
          <label for="reg-password" class="form-label">Password</label>
          <input
              type="password"
              id="reg-password"
              class="form-control"
              v-model="passwordField"
              placeholder="Create a strong password"
              required
          />
        </div>

        <div class="mb-3">
          <label for="reg-username" class="form-label">Displayed username</label>
          <input
              type="text"
              id="reg-username"
              class="form-control"
              v-model="usernameField"
              placeholder="How do you want to be refered as in your profile?"
              required
          />
        </div>

        <div class="row">
          <div class="col-md-6 mb-3">
            <label for="reg-email" class="form-label">Email</label>
            <input
                type="email"
                id="reg-email"
                class="form-control"
                v-model="emailField"
                placeholder="example@mail.com"
                required
            />
          </div>
          <div class="col-md-6 mb-3">
            <label for="reg-phone" class="form-label">Phone</label>
            <input
                type="text"
                id="reg-phone"
                class="form-control"
                v-model="phoneField"
                placeholder="XXX-XXX-XXX"
            />
          </div>
        </div>

        <button type="submit" class="btn btn-primary w-100 py-2 mt-2" :disabled="loading">
          {{ loading ? "Creating account..." : "Register" }}
        </button>

        <div v-if="error" class="alert alert-danger mt-3 mb-0 text-center">
          {{ error }}
        </div>

        <div class="text-center mt-4 border-top pt-3">
          <span>Already have an account? </span>
          <router-link to="/login" class="text-decoration-none fw-bold">Login</router-link>
        </div>
      </form>
    </div>
  </div>
</template>