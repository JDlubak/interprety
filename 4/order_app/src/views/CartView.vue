<script setup>
import { computed } from 'vue';
import { cart, removeFromCart, clearCart, setQuantity } from '../services/cartService.js';
import { useRouter } from 'vue-router';

const router = useRouter();
const token = localStorage.getItem('accessToken');

if (!token) router.push('/login');

const totalPrice = computed(() =>
    cart.value.reduce((sum, item) => sum + item.price * item.quantity, 0)
);

const goHome = () => router.push('/');
const goProducts = () => router.push('/products');
</script>

<template>
  <div class="container mt-5">
    <div class="d-flex align-items-center mb-4">
      <h1 class="me-auto">Cart</h1>
      <div>
        <button class="btn btn-secondary me-2" @click="goHome">Home</button>
        <button class="btn btn-warning" @click="goProducts">View Products</button>
      </div>
    </div>

    <div v-if="cart.length === 0" class="alert alert-info">
      Your cart is currently empty.
    </div>

    <table v-else class="table table-striped table-bordered align-middle">
      <thead class="table-dark">
      <tr>
        <th>Name</th>
        <th>Price</th>
        <th>Quantity</th>
        <th>Total</th>
        <th></th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="item in cart" :key="item.id">
        <td>{{ item.product }}</td>
        <td>{{ item.price }} zł</td>
        <td>
          <input type="number" class="form-control form-control-sm text-center"
                 v-model.number="item.quantity"
                 @change="setQuantity(item.id, item.quantity)"
                 min="0">
        </td>
        <td>{{ (item.price * item.quantity).toFixed(2) }} $</td>
        <td>
          <button class="btn btn-sm btn-danger" @click="removeFromCart(item.id)">X</button>
        </td>
      </tr>
      </tbody>
    </table>

    <div v-if="cart.length > 0" class="mt-3 d-flex justify-content-between align-items-center">
      <h4>Total amount: {{ totalPrice.toFixed(2) }} $</h4>
      <button class="btn btn-secondary" @click="clearCart">Empty cart</button>
    </div>
  </div>
</template>
