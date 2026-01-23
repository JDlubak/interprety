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
  <div class="container mt-5 pb-5 animate-in" style="max-width: 750px;">
    <div class="card shadow-lg border-0 rounded-4 overflow-hidden bg-white">
      <div class="card-header bg-dark text-white p-5 text-center border-0 position-relative">
        <div class="header-overlay"></div>
        <div class="position-relative z-index-10">
          <h1 class="display-6 fw-bold mb-0">Welcome, {{ role === 'worker' ? 'Staff Member' : 'Customer' }}</h1>
          <p class="text-white-50 mt-2 mb-0" v-if="role === 'customer'">Manage your account and track your orders</p>
          <p class="text-white-50 mt-2 mb-0" v-else>Operational dashboard and management</p>
        </div>
      </div>

      <div class="card-body p-4 p-md-5">
        <div v-if="role === 'customer'">
          <div v-if="loading" class="text-center py-5">
            <div class="spinner-grow text-primary" role="status"></div>
            <p class="text-muted mt-2 small fw-bold text-uppercase">Fetching profile...</p>
          </div>

          <Transition name="slide-fade">
            <div v-if="!loading && profile" class="profile-section">
              <div class="d-flex align-items-center mb-4">
                <h4 class="fw-bold mb-0 text-dark">Your Information</h4>
                <div class="flex-grow-1 ms-3 border-bottom opacity-25"></div>
              </div>

              <div class="row g-4">
                <div class="col-md-6">
                  <div class="info-box p-3 rounded-4 bg-light border-0">
                    <label class="text-muted fw-bold small text-uppercase mb-1 d-block">Username</label>
                    <div class="fs-5 fw-medium text-dark">{{ profile.username }}</div>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="info-box p-3 rounded-4 bg-light border-0">
                    <label class="text-muted fw-bold small text-uppercase mb-1 d-block">Email Address</label>
                    <div class="fs-5 fw-medium text-dark">{{ profile.email }}</div>
                  </div>
                </div>
                <div class="col-12">
                  <div class="info-box p-3 rounded-4 bg-light border-0">
                    <label class="text-muted fw-bold small text-uppercase mb-1 d-block">Phone Number</label>
                    <div class="fs-5 fw-medium text-dark">{{ profile.phone || 'Not provided' }}</div>
                  </div>
                </div>
              </div>
            </div>
          </Transition>

          <div v-if="!loading && error" class="alert glass-alert alert-warning border-0 rounded-4 text-center">
            <i class="bi bi-exclamation-triangle me-2"></i> {{ error }}
          </div>
        </div>

        <div v-if="role === 'worker'" class="worker-dashboard py-4 text-center">
          <div class="status-badge d-inline-block px-4 py-2 rounded-pill bg-primary-subtle text-primary fw-bold mb-4">
            <i class="bi bi-shield-lock-fill me-2"></i> Administrator Mode
          </div>
          <div class="row justify-content-center">
            <div class="col-md-10">
              <div class="alert alert-info border-0 rounded-4 shadow-sm bg-light py-3 mt-3">
                <i class="bi bi-info-circle-fill text-info me-2"></i>
                Navigate using the controls below to begin management tasks.
              </div>
            </div>
          </div>
        </div>

        <div class="navigation-grid mt-5 pt-4 border-top">
          <div class="row g-3">
            <div class="col-6 col-md-3">
              <button class="btn btn-warning w-100 py-3 rounded-4 fw-bold shadow-sm nav-btn" @click="viewProducts">
                <i class="bi bi-box-seam d-block fs-4 mb-1"></i> Shop
              </button>
            </div>
            <div class="col-6 col-md-3">
              <button :class="role === 'worker' ? 'btn-info text-white' : 'btn-primary'"
                      class="btn w-100 py-3 rounded-4 fw-bold shadow-sm nav-btn" @click="viewOrders">
                <i class="bi bi-receipt d-block fs-4 mb-1"></i> Orders
              </button>
            </div>
            <div class="col-6 col-md-3">
              <button v-if="role === 'customer'" class="btn btn-success w-100 py-3 rounded-4 fw-bold shadow-sm nav-btn" @click="viewCart">
                <i class="bi bi-cart3 d-block fs-4 mb-1"></i> Cart
              </button>
            </div>
            <div class="col-6 col-md-3">
              <button class="btn btn-outline-danger w-100 py-3 rounded-4 fw-bold nav-btn" @click="handleLogout">
                <i class="bi bi-power d-block fs-4 mb-1"></i> Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-in {
  animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

.header-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: linear-gradient(135deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 100%);
  pointer-events: none;
}

.info-box {
  transition: transform 0.2s ease, background-color 0.2s ease;
}

.info-box:hover {
  background-color: #f8f9fa !important;
  transform: translateY(-2px);
}

.glass-alert {
  background: rgba(255, 193, 7, 0.1);
  backdrop-filter: blur(10px);
}

.nav-btn {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.nav-btn:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0,0,0,0.1) !important;
}

.nav-btn:active {
  transform: scale(0.95);
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

.z-index-10 { z-index: 10; }
</style>