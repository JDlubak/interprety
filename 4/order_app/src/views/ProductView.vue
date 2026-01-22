<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { getProducts, updateProduct, getProductSeoDescription, createProduct } from '../services/productService.js';
import { getCategories } from '../services/categoriesService.js';
import { addToCart } from '../services/cartService.js';
import { getRoleFromToken } from "../services/api.js";
import { processCSVInitialization } from '../services/csvService.js';

const router = useRouter();

const token = localStorage.getItem('accessToken');
const role = getRoleFromToken(token);

if (!token || !role || !['worker', 'customer'].includes(role)) {
  localStorage.clear();
  router.push('/login');
}

const products = ref([]);
const quantities = ref({});
const categories = ref([]);
const categoryMap = ref({});
const nameFilter = ref('');
const selectedCategory = ref('');

const loading = ref(true);
const actionLoading = ref(false);
const globalError = ref(null);
const showCreateForm = ref(false);
const showModal = ref(false);

const status = ref({ message: '', type: 'success' });
const newProduct = ref({ name: '', price: 0, weight: 0, categoryId: '' });

const modalProduct = ref(null);
const modalDescription = ref('');
const fileInput = ref(null);

const notify = (msg, type = 'success') => {
  status.value.message = msg;
  status.value.type = type;
  setTimeout(() => status.value.message = '', 5000);
};

const fetch = async () => {
  loading.value = true;
  globalError.value = null;
  try {
    const [productData, categoryData] = await Promise.all([getProducts(), getCategories()]);
    categories.value = categoryData.message;
    products.value = productData.message.map(p => ({
      ...p,
      categoryId: p.categoryId || categories.value.find(c => c.category === p.category)?.id
    }));
    products.value.forEach(p => quantities.value[p.id] = 1);
    categories.value.forEach(cat => categoryMap.value[cat.id] = cat.category);
  } catch (err) {
    globalError.value = err;
  } finally {
    loading.value = false;
  }
};

const handleCreateProduct = async () => {
  actionLoading.value = true;
  try {
    await createProduct(newProduct.value);
    notify(`Product "${newProduct.value.name}" created!`);
    showCreateForm.value = false;
    newProduct.value = { name: '', price: 0, weight: 0, categoryId: '' };
    await fetch();
  } catch (err) {
    notify(`Creation failed: ${err}`, 'danger');
  } finally {
    actionLoading.value = false;
  }
};

const handleFileUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  actionLoading.value = true;
  try {
    await processCSVInitialization(file, token);
    notify("Database initialized via CSV!");
    await fetch();
  } catch (err) {
    notify(`CSV Error: ${err}`, 'danger');
  } finally {
    actionLoading.value = false;
    event.target.value = '';
  }
};

const handleAddToCart = (product) => {
  const quantity = Number(quantities.value[product.id]);
  if (!quantity || quantity <= 0) {
    notify("Please enter a valid quantity (greater than 0).", "danger");
    return;
  }
  addToCart(product, quantity);
  notify(`Added ${quantity} items to cart!`);
};

const updateField = async (id, field, value) => {
  try {
    await updateProduct(id, { [field]: value });
    notify("Field updated!");
    if (field === 'categoryId') {
      const p = products.value.find(prod => prod.id === id);
      if (p) p.category = categoryMap.value[value];
    }
  } catch (err) {
    notify(`${err}`, 'danger');
    await fetch();
  }
};

const viewDescription = (product) => {
  modalProduct.value = product;
  modalDescription.value = (product.description || '').replace(/\?/g, ' ');
  showModal.value = true;
};

const optimizeDescription = async () => {
  if (!modalProduct.value) return;
  actionLoading.value = true;
  try {
    const seoResult = await getProductSeoDescription(modalProduct.value.id);
    modalDescription.value = seoResult || '';
  } catch (err) {
    notify(`SEO error: ${err}`, 'danger');
  } finally {
    actionLoading.value = false;
  }
};

const saveDescription = async () => {
  actionLoading.value = true;
  try {
    await updateProduct(modalProduct.value.id, { description: modalDescription.value });
    modalProduct.value.description = modalDescription.value;
    notify('Saved!');
    showModal.value = false;
  } catch (err) {
    notify(`Save failed: ${err}`, 'danger');
  } finally {
    actionLoading.value = false;
  }
};

const filteredProducts = computed(() => {
  return products.value.filter(p => {
    const matchesName = p.product.toLowerCase().includes(nameFilter.value.toLowerCase());
    const matchesCategory = !selectedCategory.value || p.category === selectedCategory.value;
    return matchesName && matchesCategory;
  });
});

const goHome = () => router.push('/');
const goCart = () => router.push('/cart');
const triggerFileSelect = () => fileInput.value.click();

onMounted(fetch);
</script>

<template>
  <div class="container mt-5 pb-5">
    <div class="d-flex align-items-center mb-4 border-bottom pb-3">
      <h1 class="me-auto mb-0">{{ showCreateForm ? 'New Product' : 'Products' }}</h1>
      <div class="btn-group shadow-sm">
        <button v-if="role === 'worker'" class="btn" :class="showCreateForm ? 'btn-outline-secondary' : 'btn-success'" @click="showCreateForm = !showCreateForm">
          {{ showCreateForm ? 'Back to List' : '+ Add Product' }}
        </button>
        <button class="btn btn-secondary" @click="goHome">Home</button>
        <button v-if="role === 'customer'" class="btn btn-warning" @click="goCart">Cart</button>
      </div>
    </div>

    <Transition name="fade">
      <div v-if="status.message" :class="['alert text-center shadow-lg fixed-top mx-auto mt-3 w-50 custom-alert', 'alert-' + status.type]">
        {{ status.message }}
      </div>
    </Transition>

    <div v-if="globalError" class="alert alert-danger py-5 text-center">
      <h3>Connection Failed</h3>
      <p>{{ globalError }}</p>
      <button class="btn btn-danger px-4" @click="fetch">Retry</button>
    </div>

    <div v-else>
      <div v-if="loading && products.length === 0" class="text-center py-5">
        <div class="spinner-border text-primary"></div>
      </div>

      <div v-if="showCreateForm && role === 'worker'" class="card shadow-sm border-0 bg-light mb-5 position-relative overflow-hidden">
        <div v-if="actionLoading" class="inner-overlay d-flex align-items-center justify-content-center">
          <div class="spinner-border text-success"></div>
        </div>
        <div class="card-body p-4">
          <h4 class="mb-4">Create New Product</h4>
          <form @submit.prevent="handleCreateProduct">
            <div class="row g-3">
              <div class="col-md-6"><label class="form-label fw-bold">Name</label><input type="text" class="form-control" v-model="newProduct.name" required></div>
              <div class="col-md-3"><label class="form-label fw-bold">Price ($)</label><input type="number" step="0.01" class="form-control" v-model.number="newProduct.price" required></div>
              <div class="col-md-3"><label class="form-label fw-bold">Weight (kg)</label><input type="number" step="0.1" class="form-control" v-model.number="newProduct.weight" required></div>
              <div class="col-12"><label class="form-label fw-bold">Category</label>
                <select class="form-select" v-model="newProduct.categoryId" required>
                  <option value="" disabled>Select category...</option>
                  <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.category }}</option>
                </select>
              </div>
              <div class="col-12 text-end mt-4">
                <button type="submit" class="btn btn-success px-5 py-2 fw-bold" :disabled="actionLoading">Save Product</button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div v-else>
        <div v-if="products.length > 0" class="row g-2 mb-4">
          <div class="col-md-8"><input type="text" class="form-control shadow-sm" placeholder="Search..." v-model="nameFilter" /></div>
          <div class="col-md-4">
            <select class="form-select shadow-sm" v-model="selectedCategory">
              <option value="">All Categories</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.category">{{ cat.category }}</option>
            </select>
          </div>
        </div>

        <div v-if="products.length === 0" class="text-center py-5 bg-white rounded border shadow-sm">
          <p class="fs-5 text-muted">There are no products in database. If only someone could do something about this...</p>
          <div v-if="role === 'worker'">
            <input type="file" ref="fileInput" class="d-none" accept=".csv" @change="handleFileUpload" />
            <button class="btn btn-primary btn-lg" @click="triggerFileSelect" :disabled="actionLoading">
              Initialize via CSV
            </button>
          </div>
        </div>

        <div v-else-if="filteredProducts.length === 0" class="alert alert-warning text-center shadow-sm">
          No products match your current filters.
        </div>

        <div v-else class="table-responsive shadow-sm rounded">
          <table class="table table-hover table-bordered bg-white align-middle mb-0">
            <thead class="table-dark">
            <tr>
              <th class="text-center">Name</th>
              <th class="text-center">Price</th>
              <th class="text-center">Weight</th>
              <th class="text-center">Category</th>
              <th v-if="role === 'customer'" style="width: 100px;" class="text-center">Quantity</th>
              <th class="text-center">Actions</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="product in filteredProducts" :key="product.id">
              <template v-if="role === 'customer'">
                <td class="fw-bold text-center">{{ product.product }}</td>
                <td class="text-center">{{ product.price }} $</td>
                <td class="text-center">{{ product.weight }} kg</td>
                <td class="text-center">{{ product.category }}</td>
                <td class="text-center"><input type="number" class="form-control form-control-sm" v-model.number="quantities[product.id]"></td>
                <td class="text-center">
                  <div class="btn-group w-100">
                    <button class="btn btn-primary btn-sm" @click="handleAddToCart(product)">Add</button>
                    <button class="btn btn-outline-info btn-sm" @click="viewDescription(product)">Details</button>
                  </div>
                </td>
              </template>
              <template v-else-if="role === 'worker'">
                <td class="text-center"><input type="text" class="form-control form-control-sm border-0" v-model="product.product" @change="updateField(product.id, 'name', product.product)"></td>
                <td class="text-center"><input type="number" class="form-control form-control-sm border-0" v-model.number="product.price" @change="updateField(product.id, 'price', product.price)"></td>
                <td class="text-center"><input type="number" class="form-control form-control-sm border-0" v-model.number="product.weight" @change="updateField(product.id, 'weight', product.weight)"></td>
                <td class="text-center"><select class="form-select form-select-sm border-0" v-model="product.categoryId" @change="updateField(product.id, 'categoryId', product.categoryId)"><option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.category }}</option></select></td>
                <td class="text-center"><button class="btn btn-sm btn-info w-100 text-white" @click="viewDescription(product)">Edit Description</button></td>
              </template>
            </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <Transition name="fade">
    <div v-if="showModal" class="modal-overlay">
      <div class="modal-card shadow-lg p-4">
        <div v-if="actionLoading" class="inner-overlay rounded"><div class="spinner-border text-info"></div></div>

        <div class="d-flex justify-content-between align-items-center mb-3">
          <h4 class="mb-0">{{ role === 'worker' ? 'Edit Content' : 'Product Information' }}</h4>
          <button class="btn-close" @click="showModal = false"></button>
        </div>

        <div class="modal-body mb-3">
          <div v-if="role === 'customer'" v-html="modalDescription || '<i>No description available.</i>'" class="p-3 bg-light border rounded overflow-auto" style="max-height: 50vh;"></div>
          <textarea v-else class="form-control" rows="12" v-model="modalDescription" placeholder="Description content..."></textarea>
        </div>

        <div class="d-flex justify-content-end gap-2">
          <button class="btn btn-secondary" @click="showModal = false">Close</button>
          <template v-if="role === 'worker'">
            <button class="btn btn-outline-primary" @click="optimizeDescription" :disabled="actionLoading">✨ AI SEO</button>
            <button class="btn btn-primary px-4" @click="saveDescription" :disabled="actionLoading">Save</button>
          </template>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal-card {
  background: white;
  width: 90%;
  max-width: 800px;
  border-radius: 8px;
  position: relative;
}

.custom-alert { z-index: 3000; }

.inner-overlay {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(255, 255, 255, 0.7);
  display: flex; align-items: center; justify-content: center; z-index: 10;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.table-responsive { max-height: 70vh; overflow-y: auto; }
</style>