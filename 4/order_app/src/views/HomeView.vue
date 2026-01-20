<script setup>
import { useRouter } from 'vue-router';
import { getRoleFromToken } from "../services/auth.js";

const router = useRouter();

const handleLogout = () => {
  localStorage.clear();
  router.push('/login');
};

const token = localStorage.getItem('accessToken');
const role = getRoleFromToken(token);
if (!token || !role || !['worker', 'customer'].includes(role)) {
  handleLogout();
}

const viewProducts = () => router.push('/products');
const viewCart = () => router.push('/cart');

</script>

<template>
  <div class="container mt-5" style="max-width: 600px;">
    <div class="card text-center">
      <div class="card-body">
        <button class="btn btn-danger mt-3" @click="handleLogout">Logout</button>
        <div class="d-flex justify-content-center mt-3 gap-2">
          <button class="btn btn-warning" @click="viewProducts">Products</button>
          <button class="btn btn-warning" @click="viewCart" v-if="role === 'customer'">Cart</button>
        </div>
      </div>
    </div>
  </div>
</template>