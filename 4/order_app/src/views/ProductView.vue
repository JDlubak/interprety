<script setup>
import { ref, onMounted, computed } from 'vue';
import { getProducts, updateProduct, getProductSeoDescription } from '../services/productService.js';
import { getCategories } from '../services/categoriesService.js';
import { useRouter } from 'vue-router';
import { addToCart } from '../services/cartService.js';
import { getRoleFromToken } from "../services/auth.js";

const router = useRouter();
const token = localStorage.getItem('accessToken');
const role = getRoleFromToken(token);
if (!token || !role || !['worker', 'customer'].includes(role)) {
  localStorage.clear();
  router.push('/login');
}

const products = ref([]);
const categories = ref([]);
const nameFilter = ref('');
const selectedCategory = ref('');
const loading = ref(true);
const error = ref(null);
const quantities = ref({});

const showMess = ref(false);
const mess = ref('');
const categoryMap = ref({});

const showModal = ref(false);
const modalProduct = ref(null);
const modalDescription = ref('');

const fetch = async () => {
  loading.value = true;
  error.value = null;
  try {
    const productData = await getProducts();
    const categoryData = await getCategories();
    categories.value = categoryData.message;
    products.value = productData.message.map(p => ({
      ...p,
      categoryId: p.categoryId || categories.value.find(c => c.category === p.category)?.id
    }));
    products.value.forEach(p => quantities.value[p.id] = 1);
    categories.value.forEach(cat => categoryMap[cat.id] = cat.category);
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
};

const updateField = async (id, field, value) => {
  const data = { [field]: value };
  const product = products.value.find(p => p.id === id);

  try {
    await updateProduct(id, data, token);
    let displayValue = value;
    let displayField = field;
    if (field === 'categoryId') {
      displayValue = categoryMap[value] || value;
      displayField = 'category';
      if (product) product.category = displayValue;
    }
    mess.value = `Updated ${displayField} to ${displayValue} successfully!`;
    showMess.value = true;
    setTimeout(() => showMess.value = false, 5000);
  } catch (err) {
    mess.value = `${err} - ${field} not changed!`;
    showMess.value = true;
    setTimeout(() => showMess.value = false, 5000);
  }
};

const viewDescription = (product) => {
  modalProduct.value = product;
  if (!product.description || product.description.trim() === '') {
    modalDescription.value = '<i>Description is empty and cannot be displayed.</i>';
  } else {
    modalDescription.value = product.description.replace(/\?/g, ' ');
  }
  showModal.value = true;
};

const optimizeDescription = async () => {
  if (!modalProduct.value) return;
  try {
    const seoResult = await getProductSeoDescription(modalProduct.value.id, token);
    modalDescription.value = seoResult || '';
  } catch (err) {
    mess.value = `SEO optimization failed: ${err}`;
    showMess.value = true;
    setTimeout(() => showMess.value = false, 5000);
  }
};

const saveDescription = async () => {
  if (!modalProduct.value) return;
  try {
    await updateProduct(modalProduct.value.id, { description: modalDescription.value }, token);
    modalProduct.value.description = modalDescription.value;
    mess.value = 'Description saved successfully!';
    showMess.value = true;
    setTimeout(() => showMess.value = false, 5000);
    showModal.value = false;
  } catch (err) {
    mess.value = `Failed to save description: ${err}`;
    showMess.value = true;
    setTimeout(() => showMess.value = false, 5000);
  }
};

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

onMounted(fetch);
</script>

<template>
  <div class="container mt-5">
    <div class="d-flex align-items-center mb-4">
      <h1 class="me-auto">Product List</h1>
      <div>
        <button class="btn btn-secondary me-2" @click="goHome">Home</button>
        <button v-if="role === 'customer'" class="btn btn-warning" @click="goCart">Cart</button>
      </div>
    </div>

    <div v-if="showMess" class="alert alert-success text-center">{{ mess }}</div>
    <div v-if="loading" class="text-center">Loading...</div>
    <div v-else-if="error" class="alert alert-danger">{{ error }}</div>

    <div v-else>
      <div class="row mb-3">
        <div class="col-md-6 mb-2">
          <input type="text" class="form-control" placeholder="Filter by name..." v-model="nameFilter" />
        </div>
        <div class="col-md-6 mb-2">
          <select class="form-select" v-model="selectedCategory">
            <option value="">All categories</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.category">{{ cat.category }}</option>
          </select>
        </div>
      </div>
      <div v-if="products.length === 0" class="alert alert-info text-center">
        There are no products in the database! If only someone could do something about this...
        <div v-if="role === 'worker'" class="mt-3">
          <button class="btn btn-success" @click="showInit = true">
            Init database
          </button>
        </div>
      </div>
      <div v-else-if="filteredProducts.length === 0" class="alert alert-warning text-center">
        There are no products that match these filters.
      </div>
      <table v-else class="table table-striped table-bordered">
        <thead class="table-dark">
        <tr>
          <th>Name</th>
          <th>Price</th>
          <th>Weight</th>
          <th>Category</th>
          <th v-if="role === 'customer'">Quantity </th>
          <th></th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="product in filteredProducts" :key="product.id">
          <template v-if="role==='customer'">
            <td>{{ product.product }}</td>
            <td>{{ product.price }} $</td>
            <td>{{ product.weight }} kg</td>
            <td>{{ product.category }}</td>
            <td><input type="number" class="form-control form-control-sm me-1 text-center" min="1" v-model.number="quantities[product.id]" style="width: 60px;"></td>
            <td>
              <div class="d-flex justify-content-between">
                <button class="btn btn-primary btn-sm" @click="handleAddToCart(product)">Add to cart</button>
                <button class="btn btn-sm btn-info" @click="viewDescription(product)">View Description</button>
              </div>
            </td>
          </template>

          <template v-else-if="role==='worker'">
            <td><input type="text" class="form-control form-control-sm" v-model="product.product" @change="updateField(product.id, 'name', product.product)"></td>
            <td><input type="number" class="form-control form-control-sm" v-model.number="product.price" @change="updateField(product.id, 'price', product.price)"></td>
            <td><input type="number" class="form-control form-control-sm" v-model.number="product.weight" @change="updateField(product.id, 'weight', product.weight)"></td>
            <td>
              <select class="form-select form-select-sm" v-model="product.categoryId" @change="updateField(product.id, 'categoryId', product.categoryId)">
                <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.category }}</option>
              </select>
            </td>
            <td>
              <button class="btn btn-sm btn-info" @click="viewDescription(product)">View/Edit Description</button>
            </td>
          </template>
        </tr>
        </tbody>
      </table>
    </div>
  </div>

  <div v-if="showModal" class="fixed inset-0 flex items-center justify-center z-50">
    <div class="absolute inset-0 bg-black opacity-50" @click="showModal = false"></div>

    <div class="relative bg-white rounded shadow-lg p-4 w-full max-w-3xl z-10" @click.stop
         style="top: 50%; left: 50%; transform: translate(-50%, -50%); position: fixed;">
      <div class="d-flex justify-content-end align-items-center mb-3">
        <button type="button" class="btn-close" @click="showModal = false"></button>
      </div>

      <div class="modal-body" v-if="role==='customer'">
        <div v-html="modalDescription" style="max-height: 60vh; overflow-y: auto;"></div>
      </div>

      <div class="modal-body" v-else>
        <textarea class="form-control" rows="8" v-model="modalDescription"></textarea>
      </div>

      <div class="modal-footer mt-3 d-flex justify-content-end gap-2">
        <button class="btn btn-secondary" @click="showModal = false">Close</button>
        <button v-if="role==='worker'" class="btn btn-info" @click="optimizeDescription">Optimize Description</button>
        <button v-if="role==='worker'" class="btn btn-primary" @click="saveDescription">Save</button>
      </div>
    </div>
  </div>


</template>
