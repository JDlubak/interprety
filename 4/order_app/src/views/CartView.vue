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
      console.log(p);
      contactForm.value.id = p.customer_id;
      contactForm.value.name = p.name || '';
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
    setTimeout(() => router.push('/'), 2000);
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
</script>

<template>
  <div class="container mt-5 pb-5">
    <div class="d-flex align-items-center mb-4 border-bottom pb-3">
      <h1 class="me-auto mb-0">Checkout</h1>
      <div class="btn-group shadow-sm">
        <button class="btn btn-secondary" @click="goHome">Home</button>
        <button class="btn btn-warning" @click="goProducts">Add More</button>
      </div>
    </div>

    <Transition name="fade">
      <div v-if="status.message" :class="['alert text-center shadow fixed-top mx-auto mt-3 w-50', 'alert-' + status.type]" style="z-index: 2000;">
        {{ status.message }}
      </div>
    </Transition>

    <div v-if="cart.length === 0" class="text-center py-5">
      <p class="fs-4 text-muted">Your cart is empty.</p>
      <button class="btn btn-primary" @click="goProducts">Browse Products</button>
    </div>

    <div v-else class="row g-4">
      <div class="col-lg-8">
        <div class="table-responsive shadow-sm rounded">
          <table class="table table-hover table-bordered bg-white align-middle mb-0 text-center">
            <thead class="table-dark">
            <tr>
              <th class="text-center">Product</th>
              <th class="text-center">Price</th>
              <th class="text-center">Quantity</th>
              <th class="text-center">Sum</th>
              <th class="text-center">Action</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="item in cart" :key="item.id">
              <td class="fw-bold">{{ item.product }}</td>
              <td>{{ item.price }} $</td>
              <td>
                <div class="d-flex justify-content-center align-items-center gap-2">
                  <button class="btn btn-outline-secondary btn-sm" @click="changeQty(item.id, -1)">-</button>
                  <span class="fw-bold" style="min-width: 30px;">{{ item.quantity }}</span>
                  <button class="btn btn-outline-secondary btn-sm" @click="changeQty(item.id, 1)">+</button>
                </div>
              </td>
              <td>{{ (item.price * item.quantity).toFixed(2) }} $</td>
              <td>
                <button class="btn btn-outline-danger btn-sm" @click="removeFromCart(item.id)">Remove</button>
              </td>
            </tr>
            </tbody>
            <tfoot class="table-light">
            <tr>
              <td colspan="3" class="text-end fw-bold">Total Amount:</td>
              <td colspan="2" class="text-center fw-bold fs-5 text-primary">{{ totalPrice.toFixed(2) }} $</td>
            </tr>
            </tfoot>
          </table>
        </div>
        <button class="btn btn-sm btn-link text-danger mt-2" @click="clearCart">Clear all items</button>
      </div>

      <div class="col-lg-4">
        <div class="card shadow-sm border-0 bg-light">
          <div class="card-body p-4">
            <h4 class="mb-4">Contact Details</h4>
            <form @submit.prevent="handlePlaceOrder">
              <div class="mb-3">
                <label class="form-label small fw-bold">Full Name</label>
                <input type="text" class="form-control" v-model="contactForm.name" required>
              </div>
              <div class="mb-3">
                <label class="form-label small fw-bold text-muted">Email</label>
                <input type="email" class="form-control text-center bg-light border-0"
                       :value="contactForm.email" readonly>
                <div class="form-text small">Email assigned to your account.</div>
              </div>
              <div class="mb-3">
                <label class="form-label small fw-bold text-muted">Phone</label>
                <input type="text" class="form-control text-center bg-light border-0"
                       :value="contactForm.phone" readonly>
                <div class="form-text small">Phone number assigned to your account.</div>
              </div>
              <hr>
              <button type="submit" class="btn btn-success w-100 py-3 fw-bold shadow-sm" :disabled="actionLoading">
                {{ actionLoading ? 'Processing...' : 'CONFIRM ORDER' }}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>