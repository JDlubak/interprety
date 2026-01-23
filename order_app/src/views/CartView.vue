<script setup>
import { ref, computed, onMounted } from 'vue';
import { cart, removeFromCart, clearCart, setQuantity } from '../services/cartService.js';
import { getProfile } from '../services/authService.js';
import { useRouter } from 'vue-router';
import { createOrder} from "../services/orderService.js";

const router = useRouter();
const token = localStorage.getItem('accessToken');

if (!token) router.push('/login');

const status = ref({ message: '', type: 'success' });
const actionLoading = ref(false);
const orderFinished = ref(false);

const contactForm = ref({
  id: null,
  name: '',
  email: '',
  phone: ''
});

const notify = (msg, type = 'success') => {
  status.value.message = msg;
  status.value.type = type;
  setTimeout(() => status.value.message = '', 5000);
};

onMounted(async () => {
  try {
    const profileData = await getProfile();
    if (profileData && profileData.message && profileData.message[0]) {
      const p = profileData.message[0];
      contactForm.value.id = p.customer_id;
      contactForm.value.name = p.username || '';
      contactForm.value.email = p.email || '';
      contactForm.value.phone = p.phone || '';
    }
  } catch (err) {
    console.error("Failed to pre-fill form", err);
  }
});

const totalPrice = computed(() =>
    cart.value.reduce((sum, item) => sum + item.price * item.quantity, 0)
);

const validateForm = () => {
  const f = contactForm.value;
  if (!f.id) return "User identification failed. Please log in again.";
  if (!f.name || f.name.trim().split(/\s+/).length < 2) return "Full name is required (First and Last name).";
  if (cart.value.length === 0) return "Your cart is empty.";
  return null;
};

const handlePlaceOrder = async () => {
  const errorMessage = validateForm();
  if (errorMessage) {
    notify(errorMessage, 'danger');
    return;
  }

  actionLoading.value = true;
  try {
    const orderData = {
      customerId: contactForm.value.id,
      fullName: contactForm.value.name,
      items: cart.value.map(item => ({
        productId: item.id,
        quantity: item.quantity,
        unitPrice: item.price,
        vat: 23.00,
        discount: 0.0000
      }))
    };
    await createOrder(orderData);
    notify("Order placed successfully!", "success");
    clearCart();
    orderFinished.value = true;
  } catch (err) {
    notify(err.message || err, 'danger');
  } finally {
    actionLoading.value = false;
  }
};

const changeQty = (id, delta) => {
  const item = cart.value.find(i => i.id === id);
  if (item) {
    const newQty = item.quantity + delta;
    if (newQty >= 1) setQuantity(id, newQty);
    else if (newQty === 0) removeFromCart(id);
  }
};

const goHome = () => router.push('/');
const goProducts = () => router.push('/products');
const goOrders = () => router.push('/orders');
</script>

<template>
  <div class="container mt-5 pb-5 animate-in">
    <div class="d-flex align-items-center mb-5 border-bottom pb-3 justify-content-between">
      <div>
        <h1 class="display-6 fw-bold text-dark mb-0">
          <i class="bi bi-cart-check text-primary me-2"></i>Checkout
        </h1>
        <p class="text-muted mb-0">Review your items and confirm details</p>
      </div>
      <div class="btn-group shadow-sm rounded-pill overflow-hidden">
        <button class="btn btn-light px-4" @click="goHome">
          <i class="bi bi-house"></i> Home
        </button>
        <button class="btn btn-warning px-4" @click="goProducts">
          <i class="bi bi-plus-lg me-1"></i> Add More
        </button>
      </div>
    </div>

    <Transition name="slide-fade">
      <div v-if="status.message"
           :class="['glass-alert alert text-center shadow-lg fixed-top mx-auto mt-4', 'alert-' + status.type]">
        <i class="bi me-2" :class="status.type === 'success' ? 'bi-check-circle' : 'bi-exclamation-triangle'"></i>
        {{ status.message }}
      </div>
    </Transition>

    <div v-if="orderFinished" class="text-center py-5">
      <div class="card shadow-lg border-0 p-5 rounded-4 bg-white mx-auto" style="max-width: 600px;">
        <div class="mb-4 scale-up">
          <i class="bi bi-check-circle-fill text-success" style="font-size: 5rem;"></i>
        </div>
        <h2 class="fw-bold text-dark">Success!</h2>
        <p class="fs-5 text-muted mb-4">Your order has been placed and is now being processed.</p>
        <div class="d-grid gap-3 d-sm-flex justify-content-sm-center">
          <button class="btn btn-primary btn-lg rounded-pill px-5 shadow" @click="goOrders">View My Orders</button>
          <button class="btn btn-outline-secondary btn-lg rounded-pill px-4" @click="goProducts">Continue Shopping</button>
        </div>
      </div>
    </div>

    <div v-else-if="cart.length === 0" class="text-center py-5 empty-state rounded-4 border bg-white shadow-sm">
      <i class="bi bi-cart-x display-1 text-muted opacity-25 mb-3"></i>
      <p class="fs-4 text-muted mb-4">Your cart is currently empty.</p>
      <button class="btn btn-primary btn-lg rounded-pill px-5 shadow-sm" @click="goProducts">Browse Products</button>
    </div>

    <div v-else class="row g-4">
      <div class="col-lg-8">
        <div class="table-container shadow-sm border rounded-4 overflow-hidden bg-white">
          <table class="table table-hover align-middle mb-0 text-center">
            <thead class="bg-dark text-white">
            <tr>
              <th class="py-3">Product</th>
              <th class="py-3">Price</th>
              <th class="py-3">Quantity</th>
              <th class="py-3">Sum</th>
              <th class="py-3"></th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="item in cart" :key="item.id" class="cart-row">
              <td class="fw-bold text-start ps-4">{{ item.product }}</td>
              <td>${{ item.price.toFixed(2) }}</td>
              <td>
                <div class="d-flex justify-content-center align-items-center gap-2">
                  <button class="btn btn-outline-secondary btn-xs rounded-circle" @click="changeQty(item.id, -1)">-</button>
                  <span class="fw-bold mx-2" style="min-width: 25px;">{{ item.quantity }}</span>
                  <button class="btn btn-outline-secondary btn-xs rounded-circle" @click="changeQty(item.id, 1)">+</button>
                </div>
              </td>
              <td class="fw-medium text-primary">${{ (item.price * item.quantity).toFixed(2) }}</td>
              <td>
                <button class="btn btn-danger btn-sm d-flex align-items-center justify-content-center mx-auto"
                        style="width: 32px; height: 32px; min-width: 32px;"
                        @click="removeFromCart(item.id)"
                        title="Remove item">X
                  <i class="bi bi-trash3-fill" style="font-size: 1rem; color: white;"></i>
                </button>
              </td>
            </tr>
            </tbody>
            <tfoot class="table-light">
            <tr>
              <td colspan="3" class="text-end fw-bold py-3">Total Amount:</td>
              <td colspan="2" class="text-center fw-bold fs-5 text-primary py-3">${{ totalPrice.toFixed(2) }}</td>
            </tr>
            </tfoot>
          </table>
        </div>
        <div class="text-start mt-3">
          <button class="btn btn-sm btn-outline-danger border-0 rounded-pill" @click="clearCart">
            <i class="bi bi-x-circle me-1"></i> Clear all items
          </button>
        </div>
      </div>

      <div class="col-lg-4">
        <div class="card shadow-lg border-0 rounded-4 bg-white overflow-hidden sticky-top" style="top: 20px;">
          <div class="card-header bg-primary text-white py-3 border-0">
            <h5 class="mb-0 fw-bold"><i class="bi bi-person-lines-fill me-2"></i>Contact Details</h5>
          </div>
          <div class="card-body p-4">
            <form @submit.prevent="handlePlaceOrder">
              <div class="mb-4">
                <label class="form-label small fw-bold text-uppercase text-muted">Full Name</label>
                <input type="text" class="form-control form-control-lg bg-light border-0 rounded-3 shadow-none" v-model="contactForm.name" placeholder="First and Last Name" required>
              </div>
              <div class="mb-4">
                <label class="form-label small fw-bold text-uppercase text-muted">Email Address</label>
                <div class="p-3 bg-light rounded-3 text-center text-dark fw-medium border">
                  {{ contactForm.email }}
                </div>
              </div>
              <div class="mb-4">
                <label class="form-label small fw-bold text-uppercase text-muted">Phone Number</label>
                <div class="p-3 bg-light rounded-3 text-center text-dark fw-medium border">
                  {{ contactForm.phone || 'Not provided' }}
                </div>
              </div>
              <div class="border-top pt-4">
                <div class="d-flex justify-content-between mb-3 h5 fw-bold">
                  <span>Grand Total:</span>
                  <span class="text-primary">${{ totalPrice.toFixed(2) }}</span>
                </div>
                <button type="submit" class="btn btn-success w-100 py-3 rounded-pill fw-bold shadow btn-place-order" :disabled="actionLoading">
                  <span v-if="actionLoading" class="spinner-border spinner-border-sm me-2"></span>
                  {{ actionLoading ? 'Processing...' : 'CONFIRM ORDER' }}
                </button>
              </div>
            </form>
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

.glass-alert {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  width: fit-content;
  min-width: 320px;
  border-radius: 50px;
  z-index: 9999;
}

.table-container {
  transition: box-shadow 0.3s ease;
}

.cart-row {
  transition: background-color 0.2s ease;
}

.cart-row:hover {
  background-color: rgba(13, 110, 253, 0.02);
}

.btn-xs {
  width: 28px;
  height: 28px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  line-height: 1;
}

.btn-place-order {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.btn-place-order:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: 0 10px 20px rgba(25, 135, 84, 0.2) !important;
}

.btn-place-order:active:not(:disabled) {
  transform: scale(0.96);
}

.scale-up {
  animation: scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes scaleIn {
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

</style>