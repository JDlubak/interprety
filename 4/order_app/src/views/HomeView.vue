<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();

const handleLogout = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  router.push('/login');
};
</script>

<template>
  <div class="container mt-5" style="max-width: 600px;">
    <div class="card text-center">
      <div class="card-body">
        <h1 class="card-title">Hello, World!</h1>
        <p class="card-text">Witaj po zalogowaniu!</p>
        <button class="btn btn-danger mt-3" @click="handleLogout">
          Logout
        </button>
      </div>
    </div>
  </div>
</template>