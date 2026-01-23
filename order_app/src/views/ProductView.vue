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
    if (err !== 'Record not found') {
      globalError.value = err;
    }
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
  <div class="container mt-5 pb-5 animate-in">
    <div class="d-flex align-items-center mb-5 border-bottom pb-3">
      <div class="me-auto">
        <h1 class="fw-bold mb-0 text-dark">
          <i class="bi bi-box-seam text-primary me-2"></i>
          {{ showCreateForm ? 'New Product' : 'Catalog' }}
        </h1>
        <p class="text-muted mb-0 small" v-if="!showCreateForm">{{ role === 'worker' ? 'Manage store inventory' : 'Browse our products' }}</p>
      </div>
      <div class="btn-group shadow-sm rounded-pill overflow-hidden">
        <button v-if="role === 'worker'" class="btn px-4" :class="showCreateForm ? 'btn-secondary' : 'btn-success'" @click="showCreateForm = !showCreateForm">
          <i class="bi" :class="showCreateForm ? 'bi-arrow-left' : 'bi-plus-lg'"></i>
          <span class="ms-2 d-none d-md-inline">{{ showCreateForm ? 'Back to List' : 'Add Product' }}</span>
        </button>
        <button class="btn btn-light px-4 border-start" @click="goHome" >
          <i class="bi bi-house"></i> Home
        </button>
        <button v-if="role === 'customer'" class="btn btn-warning px-4" @click="goCart">
          <i class="bi bi-cart3 me-1"></i> Cart
        </button>
      </div>
    </div>

    <Transition name="slide-fade">
      <div v-if="status.message"
           :class="['glass-alert alert text-center shadow fixed-top mx-auto mt-3', 'alert-' + status.type]">
        {{ status.message }}
      </div>
    </Transition>

    <div v-if="globalError" class="error-card text-center py-5 shadow-sm border rounded-4 bg-white">
      <i class="bi bi-wifi-off display-1 text-danger mb-3"></i>
      <h3 class="fw-bold">Connection Failed</h3>
      <p class="text-muted">{{ globalError }}</p>
      <button class="btn btn-primary rounded-pill px-5 mt-3" @click="fetch">Retry Connection</button>
    </div>

    <div v-else>
      <div v-if="loading && products.length === 0" class="text-center py-5">
        <div class="spinner-grow text-primary" role="status"></div>
      </div>

      <div v-if="showCreateForm && role === 'worker'" class="card shadow-lg border-0 rounded-4 mb-5 overflow-hidden">
        <div v-if="actionLoading" class="inner-overlay"><div class="spinner-border text-success"></div></div>
        <div class="card-header bg-success text-white py-3">
          <h5 class="mb-0 fw-bold"><i class="bi bi-plus-circle me-2"></i>Product Details</h5>
        </div>
        <div class="card-body p-4">
          <form @submit.prevent="handleCreateProduct">
            <div class="row g-4">
              <div class="col-md-6">
                <label class="form-label small fw-bold text-uppercase">Name</label>
                <input type="text" class="form-control form-control-lg bg-light border-0" v-model="newProduct.name" required>
              </div>
              <div class="col-md-3">
                <label class="form-label small fw-bold text-uppercase">Price ($)</label>
                <input type="number" step="0.01" class="form-control form-control-lg bg-light border-0" v-model.number="newProduct.price" required>
              </div>
              <div class="col-md-3">
                <label class="form-label small fw-bold text-uppercase">Weight (kg)</label>
                <input type="number" step="0.1" class="form-control form-control-lg bg-light border-0" v-model.number="newProduct.weight" required>
              </div>
              <div class="col-12">
                <label class="form-label small fw-bold text-uppercase">Category</label>
                <select class="form-select form-select-lg bg-light border-0" v-model="newProduct.categoryId" required>
                  <option value="" disabled>Select category...</option>
                  <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.category }}</option>
                </select>
              </div>
              <div class="col-12 text-end">
                <button type="submit" class="btn btn-success btn-lg px-5 rounded-pill shadow" :disabled="actionLoading">Save Product</button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div v-else>
        <div v-if="products.length > 0" class="filter-bar row g-3 mb-4 p-3 bg-white rounded-4 shadow-sm border mx-0 align-items-center">
          <div class="col-md-8">
            <div class="input-group">
              <span class="input-group-text bg-transparent border-0"><i class="bi bi-search"></i></span>
              <input type="text" class="form-control border-0 shadow-none" placeholder="Filter by product name..." v-model="nameFilter" />
            </div>
          </div>
          <div class="col-md-4">
            <select class="form-select rounded-pill border-0 bg-light px-3" v-model="selectedCategory">
              <option value="">All Categories</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.category">{{ cat.category }}</option>
            </select>
          </div>
        </div>

        <div v-if="products.length === 0" class="empty-state text-center py-5 bg-white rounded-4 border shadow-sm">
          <i class="bi bi-database-exclamation display-1 text-muted opacity-25 mb-3"></i>
          <p class="fs-5 text-muted mb-4">The inventory is currently empty.</p>
          <div v-if="role === 'worker'">
            <input type="file" ref="fileInput" class="d-none" accept=".csv" @change="handleFileUpload" />
            <button class="btn btn-primary btn-lg rounded-pill px-5 shadow-sm" @click="triggerFileSelect" :disabled="actionLoading">
              <i class="bi bi-file-earmark-arrow-up me-2"></i>Initialize via CSV
            </button>
          </div>
        </div>

        <div v-else-if="filteredProducts.length === 0" class="alert alert-light text-center rounded-4 border shadow-sm py-4">
          <i class="bi bi-funnel text-muted fs-4 d-block mb-2"></i>
          No products match your current filters.
        </div>

        <div v-else class="table-card shadow-sm border rounded-4 bg-white overflow-hidden">
          <table class="table table-hover align-middle mb-0">
            <thead class="bg-dark text-white">
            <tr>
              <th class="ps-4 py-3">Product Name</th>
              <th class="text-center py-3">Price</th>
              <th class="text-center py-3">Weight</th>
              <th class="text-center py-3">Category</th>
              <th v-if="role === 'customer'" class="text-center py-3" style="width: 120px;">Quantity</th>
              <th class="text-center pe-4 py-3">Actions</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="product in filteredProducts" :key="product.id" class="product-row">
              <template v-if="role === 'customer'">
                <td class="ps-4 fw-bold">{{ product.product }}</td>
                <td class="text-center fw-medium text-primary">${{ product.price }}</td>
                <td class="text-center text-muted">{{ product.weight }} kg</td>
                <td class="text-center"><span class="badge bg-light text-dark border px-3 rounded-pill">{{ product.category }}</span></td>
                <td class="text-center">
                  <input type="number" class="form-control form-control-sm text-center rounded-pill border-primary-subtle" v-model.number="quantities[product.id]">
                </td>
                <td class="text-center pe-4">
                  <div class="btn-group btn-group-sm rounded-pill shadow-sm overflow-hidden border">
                    <button class="btn btn-primary px-3" @click="handleAddToCart(product)">Add</button>
                    <button class="btn btn-light px-3 border-start" @click="viewDescription(product)">Details</button>
                  </div>
                </td>
              </template>
              <template v-else-if="role === 'worker'">
                <td class="ps-4"><input type="text" class="form-control form-control-sm border-0 bg-transparent fw-bold" v-model="product.product" @change="updateField(product.id, 'name', product.product)"></td>
                <td class="text-center px-3"><input type="number" class="form-control form-control-sm border-0 bg-transparent text-center" v-model.number="product.price" @change="updateField(product.id, 'price', product.price)"></td>
                <td class="text-center px-3"><input type="number" class="form-control form-control-sm border-0 bg-transparent text-center" v-model.number="product.weight" @change="updateField(product.id, 'weight', product.weight)"></td>
                <td class="text-center px-3">
                  <select class="form-select form-select-sm border-0 bg-transparent text-center" v-model="product.categoryId" @change="updateField(product.id, 'categoryId', product.categoryId)">
                    <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.category }}</option>
                  </select>
                </td>
                <td class="text-center pe-4">
                  <button class="btn btn-sm btn-outline-info rounded-pill px-3" @click="viewDescription(product)">Edit Details</button>
                </td>
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
      <div class="modal-card shadow-2xl overflow-hidden border-0">
        <div v-if="actionLoading" class="inner-overlay"><div class="spinner-border text-primary"></div></div>
        <div class="modal-header-styled bg-dark text-white p-4 d-flex justify-content-between align-items-center">
          <h4 class="mb-0 fw-bold">{{ role === 'worker' ? 'Edit Information' : 'About Product' }}</h4>
          <button class="btn btn-sm btn-outline-light rounded-circle border-0" @click="showModal = false"><i class="bi bi-x-lg"></i></button>
        </div>
        <div class="p-4 bg-white">
          <div v-if="role === 'customer'" v-html="modalDescription || '<i>No description available for this item.</i>'" class="p-4 bg-light rounded-4 overflow-auto border-0" style="max-height: 50vh;"></div>
          <textarea v-else class="form-control border-light bg-light rounded-4 p-3 mb-4" rows="10" v-model="modalDescription" placeholder="Write description here..."></textarea>
          <div class="d-flex justify-content-end gap-3 mt-4">
            <button class="btn btn-light rounded-pill px-4" @click="showModal = false">Close</button>
            <template v-if="role === 'worker'">
              <button class="btn btn-warning rounded-pill px-4 fw-bold" @click="optimizeDescription" :disabled="actionLoading">Generate with Groq</button>
              <button class="btn btn-primary rounded-pill px-5 fw-bold" @click="saveDescription" :disabled="actionLoading">Save</button>
            </template>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.animate-in {
  animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
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

.modal-overlay {
  background: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(5px);
  position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
  display: flex; align-items: center; justify-content: center; z-index: 2000;
}

.modal-card {
  background: white;
  width: 90%;
  max-width: 750px;
  border-radius: 24px;
}

.product-row {
  transition: all 0.2s ease;
}
.product-row:hover {
  background-color: rgba(13, 110, 253, 0.03) !important;
}

.inner-overlay {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(255, 255, 255, 0.6);
  display: flex; align-items: center; justify-content: center; z-index: 10;
  backdrop-filter: blur(1px);
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

</style>