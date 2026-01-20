<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();

const handleLogout = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  router.push('/login');
};

const viewProducts = () => {
  router.push('/products');
}

const viewCart = () => {
  router.push('/cart');
}

</script>

const

<template>
  <div class="container mt-5" style="max-width: 600px;">
    <div class="card text-center">
      <div class="card-body">
        <button class="btn btn-danger mt-3" @click="handleLogout">Logout</button>
        <div class="d-flex justify-content-center mt-3 gap-2">
          <button class="btn btn-warning" @click="viewProducts">Products</button>
          <button class="btn btn-warning" @click="viewCart">Cart</button>
        </div>
      </div>
    </div>
  </div>
</template>