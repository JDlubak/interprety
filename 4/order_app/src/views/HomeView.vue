<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getRoleFromToken } from "../services/api.js";
import { clearCart } from "../services/cartService.js";
import { getProfile } from "../services/authService.js";

const router = useRouter();
const profile = ref(null);
const loading = ref(true);
const error = ref(null);

const token = localStorage.getItem('accessToken');
const role = getRoleFromToken(token);

if (!token || !role || !['worker', 'customer'].includes(role)) {
  localStorage.clear();
  clearCart();
  router.push('/login');
}

const handleLogout = () => {
  localStorage.clear();
  clearCart();
  router.push('/login');
};

const fetchProfile = async () => {
  if (role !== 'customer') {
    loading.value = false;
    return;
  }

  try {
    loading.value = true;
    const response = await getProfile();
    if (response && response.message && response.message.length > 0) {
      profile.value = response.message[0];
    }
  } catch (err) {
    error.value = "Could not load profile details.";
    console.error(err);
  } finally {
    loading.value = false;
  }
};

onMounted(fetchProfile);

const viewProducts = () => router.push('/products');
const viewCart = () => router.push('/cart');
</script>

<template>
  <div class="container mt-5" style="max-width: 700px;">
    <div class="card shadow border-0">
      <div class="card-header bg-dark text-white p-4 text-center">
        <h2 class="mb-0">Welcome, {{ role === 'worker' ? 'Staff Member' : 'Customer' }}</h2>
      </div>

      <div class="card-body p-4">
        <div v-if="role === 'customer'">
          <div v-if="loading" class="text-center py-4">
            <div class="spinner-border text-primary" role="status"></div>
          </div>

          <div v-else-if="profile" class="profile-data mb-4">
            <h4 class="text-secondary border-bottom pb-2 mb-3">Your Information</h4>
            <div class="row mb-2">
              <div class="col-4 fw-bold">Username:</div>
              <div class="col-8">{{ profile.username }}</div>
            </div>
            <div class="row mb-2">
              <div class="col-4 fw-bold">Email:</div>
              <div class="col-8">{{ profile.email }}</div>
            </div>
            <div class="row mb-2">
              <div class="col-4 fw-bold">Phone:</div>
              <div class="col-8">{{ profile.phone || 'N/A' }}</div>
            </div>
          </div>

          <div v-else-if="error" class="alert alert-warning small">
            {{ error }}
          </div>
        </div>

        <div v-if="role === 'worker'" class="py-4 text-center">
          <p class="fs-5">You are logged in with administrative privileges.</p>
          <div class="alert alert-info">Use the button below to manage the product database.</div>
        </div>

        <div class="d-grid gap-2 d-md-flex justify-content-center mt-4">
          <button class="btn btn-warning px-4" @click="viewProducts">
            <i class="bi bi-box-seam"></i> Browse Products
          </button>

          <button v-if="role === 'customer'" class="btn btn-success px-4" @click="viewCart">
            <i class="bi bi-cart"></i> My Cart
          </button>

          <button class="btn btn-danger px-4" @click="handleLogout">
            <i class="bi bi-box-arrow-right"></i> Logout
          </button>
        </div>
      </div>
    </div>
  </div>
</template>