<script setup>
import {ref, onMounted, computed} from 'vue';
import {getProducts} from '../services/productService.js'
import {getCategories} from '../services/categoriesService.js'
import {useRouter} from 'vue-router'
import {addToCart} from '../services/cartService.js'

const products = ref([]);
const categories = ref([]);
const nameFilter = ref('');
const selectedCategory = ref('');
const loading = ref(true);
const error = ref(null);
const quantities = ref({});
const router = useRouter();

const showMess = ref(false);
const mess = ref('');

const token = localStorage.getItem('accessToken');
if (!token) router.push('/login');

const fetch = async () => {
  loading.value = true;
  error.value = null;
  try {
    const productData = await getProducts();
    products.value = productData.message;
    const categoryData = await getCategories();
    categories.value = categoryData.message;
    productData.message.forEach(p => quantities.value[p.id] = 1);
  } catch (err) {
    error.value = err;
  } finally {
    loading.value = false;
  }
};

const handleAddToCart = (product) => {
  const quantity = Number(quantities.value[product.id]);
  if (!quantity || quantity <= 0) return;
  addToCart(product, quantity);
  mess.value = `Added ${quantity} of ${product.product} to cart!`;
  showMess.value = true;
  setTimeout(() => showMess.value = false, 3000);
}

onMounted(fetch);

const filteredProducts = computed(() => {
  return products.value.filter(p => {
    const matchesName = nameFilter.value
        ? p.product.toLowerCase().includes(nameFilter.value.toLowerCase())
        : true;

    const matchesCategory = selectedCategory.value
        ? p.category === selectedCategory.value
        : true;

    return matchesName && matchesCategory;
  });
});

const goHome = () => router.push('/');
const goCart = () => router.push('/cart');
</script>

<template>
  <div class="container mt-5">
    <div class="d-flex align-items-center mb-4">
      <h1 class="me-auto">Product List</h1>
      <div>
        <button class="btn btn-secondary me-2" @click="goHome">Home</button>
        <button class="btn btn-warning" @click="goCart">Cart</button>
      </div>
    </div>
    <div v-if="showMess" class="alert alert-success text-center">
      {{ mess }}
    </div>
    <div v-if="loading" class="text-center">Loading...</div>
    <div v-else-if="error" class="alert alert-danger">{{ error }}</div>

    <div v-else>
      <div class="row mb-3">
        <div class="col-md-6 mb-2">
          <input
              type="text"
              class="form-control"
              placeholder="Filter by name..."
              v-model="nameFilter"
          />
        </div>
        <div class="col-md-6 mb-2">
          <select class="form-select" v-model="selectedCategory">
            <option value="">All categories</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.category">{{ cat.category }}</option>
          </select>
        </div>
      </div>

      <table class="table table-striped table-bordered">
        <thead class="table-dark">
        <tr>
          <th>Name</th>
          <th>Price</th>
          <th>Weight</th>
          <th>Category</th>
          <th></th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="product in filteredProducts" :key="product.id">
          <td>{{ product.product }}</td>
          <td>{{ product.price }} $</td>
          <td>{{ product.weight }} kg</td>
          <td>{{ product.category }}</td>
          <td>
            <div class="d-flex">
              <input type="number"
                     class="form-control form-control-sm me-1 text-center"
                     min="1"
                     v-model.number="quantities[product.id]"
                     style="width: 60px;">
              <button class="btn btn-primary btn-sm" @click="handleAddToCart(product)">
                Add to cart
              </button>
            </div>
          </td>
        </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>