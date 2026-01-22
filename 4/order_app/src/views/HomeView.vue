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
const viewOrders = () => router.push('/orders');
</script>

<template>
  <div class="container mt-5 animate-in" style="max-width: 700px;">
    <div class="card shadow border-0">
      <div class="card-header bg-dark text-white p-4 text-center rounded-top">
        <div class="mb-2">
          <i :class="role === 'worker' ? 'bi bi-person-badge' : 'bi bi-person-circle'" style="font-size: 2.5rem;"></i>
        </div>
        <h2 class="mb-0 fw-bold">Welcome, {{ role === 'worker' ? 'Staff Member' : 'Customer' }}</h2>
      </div>

      <div class="card-body p-4">
        <div v-if="role === 'customer'">
          <div v-if="loading" class="text-center py-4">
            <div class="spinner-border text-primary" role="status"></div>
          </div>

          <Transition name="fade">
            <div v-if="!loading && profile" class="profile-data mb-4">
              <h4 class="text-secondary border-bottom pb-2 mb-3 fw-bold">Your Information</h4>
              <div class="row mb-3 align-items-center">
                <div class="col-4 fw-bold text-muted uppercase small">Username:</div>
                <div class="col-8 fs-5">{{ profile.username }}</div>
              </div>
              <div class="row mb-3 align-items-center">
                <div class="col-4 fw-bold text-muted uppercase small">Email:</div>
                <div class="col-8 fs-5">{{ profile.email }}</div>
              </div>
              <div class="row mb-3 align-items-center">
                <div class="col-4 fw-bold text-muted uppercase small">Phone:</div>
                <div class="col-8 fs-5">{{ profile.phone || 'N/A' }}</div>
              </div>
            </div>
          </Transition>

          <div v-if="!loading && error" class="alert alert-warning small text-center">
            {{ error }}
          </div>
        </div>

        <div v-if="role === 'worker'" class="py-4 text-center">
          <div class="mb-3">
            <i class="bi bi-shield-check text-primary" style="font-size: 3rem;"></i>
          </div>
          <p class="fs-5 fw-semibold">You are logged in with administrative privileges.</p>
          <div class="alert alert-info border-0 shadow-sm">Use the dashboard to manage products and process customer orders.</div>
        </div>

        <div class="d-grid gap-2 d-md-flex justify-content-center mt-4 pt-3 border-top">
          <button class="btn btn-warning px-4 py-2 fw-bold shadow-sm" @click="viewProducts">
            <i class="bi bi-box-seam me-2"></i> Browse Products
          </button>

          <button :class="role === 'worker' ? 'btn btn-info text-white' : 'btn btn-primary'" class="px-4 py-2 fw-bold shadow-sm" @click="viewOrders">
            <i class="bi bi-receipt me-2"></i>
            {{ role === 'worker' ? 'Manage Orders' : 'View My Orders' }}
          </button>

          <button v-if="role === 'customer'" class="btn btn-success px-4 py-2 fw-bold shadow-sm" @click="viewCart">
            <i class="bi bi-cart me-2"></i> My Cart
          </button>

          <button class="btn btn-danger px-4 py-2 fw-bold shadow-sm" @click="handleLogout">
            <i class="bi bi-box-arrow-right me-2"></i> Logout
          </button>
        </div>
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
  transition: opacity 0.4s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.btn {
  transition: transform 0.2s, box-shadow 0.2s;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.btn:active {
  transform: scale(0.98);
}

.uppercase {
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
</style>
