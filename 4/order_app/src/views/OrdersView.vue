<script setup>
import { ref, onMounted, computed } from 'vue';
import { getOrders, changeOrderStatus, postOpinion, getOpinion } from '../services/orderService.js';
import { getRoleFromToken } from "../services/api.js";
import { useRouter } from 'vue-router';

const router = useRouter();
const role = getRoleFromToken(localStorage.getItem('accessToken'));

const rawOrders = ref([]);
const opinions = ref({});
const loading = ref(true);
const actionLoading = ref(false);
const statusFilter = ref('ALL');
const statusAlert = ref({ message: '', type: 'success' });
const showOpinionForm = ref(null);
const opinionForm = ref({ rating: 5, content: '' });
const activeDropdown = ref(null);
const cancellingOrderId = ref(null);

const notify = (msg, type = 'success') => {
  statusAlert.value.message = msg;
  statusAlert.value.type = type;
  setTimeout(() => statusAlert.value.message = '', 5000);
};

const fetchOpinion = async (orderId) => {
  try {
    const data = await getOpinion(orderId);
    opinions.value[orderId] = data.message?.[0] || data.message || null;
  } catch (err) {
    opinions.value[orderId] = null;
  }
};

const fetchOrders = async () => {
  loading.value = true;
  try {
    const data = await getOrders();
    rawOrders.value = data.message || [];
    groupedOrders.value.forEach(order => {
      fetchOpinion(order.order_id);
    });
  } catch (err) {
    const errorMsg = err.response?.data?.message || err.message || String(err);
    const ignore = ["You don't have any orders!", "Record not found"];
    const shouldIgnore = ignore.some(msg => errorMsg.includes(msg));
    if (!shouldIgnore) {
      notify(errorMsg, 'danger');
    }
    rawOrders.value = [];
  } finally {
    loading.value = false;
  }
};

const groupedOrders = computed(() => {
  const map = {};
  rawOrders.value.forEach(row => {
    if (!map[row.order_id]) {
      map[row.order_id] = {
        ...row,
        items: [],
        calculated_total: 0
      };
    }
    map[row.order_id].items.push({
      product: row.product,
      quantity: row.quantity,
      price: row.unit_price,
      discount: row.discount,
      vat: row.vat
    });
    const lineTotal = row.quantity * row.unit_price * (1 - (row.discount || 0));
    map[row.order_id].calculated_total += lineTotal;
  });
  return Object.values(map).sort((a, b) => b.order_id - a.order_id);
});

const filteredOrders = computed(() => {
  if (statusFilter.value === 'ALL') return groupedOrders.value;
  return groupedOrders.value.filter(o => o.status === statusFilter.value);
});

const updateStatus = async (orderId, newStatusName) => {
  actionLoading.value = true;
  try {
    await changeOrderStatus(orderId, { status: newStatusName });
    notify(`Order #${orderId} updated to ${newStatusName}`);
    await fetchOrders();
  } catch (err) {
    notify(err, 'danger');
  } finally {
    actionLoading.value = false;
  }
};

const openOpinionForm = (orderId) => {
  opinionForm.value = { rating: 5, content: '' };
  showOpinionForm.value = orderId;
};

const submitOpinion = async (orderId) => {
  actionLoading.value = true;
  try {
    await postOpinion(orderId, {
      rating: opinionForm.value.rating,
      content: opinionForm.value.content
    });
    notify('Opinion added successfully!');
    showOpinionForm.value = null;
    await fetchOpinion(orderId);
  } catch (err) {
    notify(err.response?.data?.message || 'Failed to add opinion', 'danger');
  } finally {
    actionLoading.value = false;
  }
};

const toggleDropdown = (orderId) => {
  if (activeDropdown.value === orderId) {
    activeDropdown.value = null;
  } else {
    activeDropdown.value = orderId;
  }
};

const handleCancelClick = (orderId) => {
  if (cancellingOrderId.value === orderId) {
    updateStatus(orderId, 'CANCELLED');
    cancellingOrderId.value = null;
  } else {
    cancellingOrderId.value = orderId;
    setTimeout(() => {
      if (cancellingOrderId.value === orderId) cancellingOrderId.value = null;
    }, 3000);
  }
};

onMounted(fetchOrders);
</script>

<template>
  <div class="container mt-5 pb-5 animate-in">
    <div class="d-flex align-items-center mb-5 border-bottom pb-3 justify-content-between">
      <div>
        <h1 class="display-6 fw-bold text-dark mb-0">
          <i class="bi bi-receipt text-primary me-2"></i>Orders Explorer
        </h1>
        <p class="text-muted mb-0">
          {{ role === 'worker' ? 'Manage customer orders and processing' : 'Track and manage your history' }}
        </p>
      </div>
      <button class="btn btn-light shadow-sm rounded-pill px-4" @click="router.push('/')">
        <i class="bi bi-house me-2"></i>Home
      </button>
    </div>

    <Transition name="slide-fade">
      <div v-if="statusAlert.message"
           :class="['glass-alert alert text-center shadow-lg fixed-top mx-auto mt-4', 'alert-' + statusAlert.type]">
        <i class="bi me-2" :class="statusAlert.type === 'success' ? 'bi-check-circle' : 'bi-exclamation-triangle'"></i>
        {{ statusAlert.message }}
      </div>
    </Transition>

    <div class="mb-4 d-flex gap-2 flex-wrap bg-white p-2 rounded-pill shadow-sm border w-fit-content px-3 mx-auto">
      <button v-for="s in ['ALL', 'UNCONFIRMED', 'CONFIRMED', 'COMPLETED', 'CANCELLED']"
              :key="s" @click="statusFilter = s"
              :class="['btn btn-sm rounded-pill px-3 fw-bold transition-all', statusFilter === s ? 'btn-dark' : 'btn-light text-muted border-0']">
        {{ s }}
      </button>
    </div>

    <div v-if="loading" class="text-center py-5">
      <div class="spinner-grow text-primary" role="status"></div>
    </div>

    <div v-else>
      <div v-if="filteredOrders.length === 0" class="text-center py-5 bg-white rounded-4 shadow-sm border mt-4">
        <i class="bi bi-box-seam display-1 text-muted opacity-25 mb-3 d-block"></i>
        <div v-if="role === 'customer'">
          <h4 class="fw-bold text-dark">No orders found</h4>
          <p class="text-muted mb-4">You don't have any {{ statusFilter !== 'ALL' ? statusFilter : '' }} order yet.</p>
          <router-link v-if="statusFilter === 'ALL'" to="/products" class="btn btn-primary rounded-pill px-5 shadow-sm">
            Start Shopping
          </router-link>
        </div>
        <div v-else>
          <h4 class="fw-bold text-dark">Empty queue</h4>
          <p class="text-muted mb-0">No {{ statusFilter !== 'ALL' ? statusFilter : '' }} orders currently in the system.</p>
        </div>
      </div>

      <div v-else class="table-container shadow-sm border rounded-4 bg-white mt-4">
        <table class="table table-hover align-middle mb-0">
          <thead class="bg-dark text-white">
          <tr>
            <th v-if="role === 'worker'" class="ps-4 py-3">Order ID</th>
            <th class="py-3">Date</th>
            <th v-if="role === 'worker'" class="py-3 text-center">Customer</th>
            <th class="py-3 text-center">Items</th>
            <th class="text-end py-3">Total</th>
            <th class="text-center py-3">Status</th>
            <th class="text-center pe-4 py-3">Actions</th>
          </tr>
          </thead>
          <tbody>
          <template v-for="order in filteredOrders" :key="order.order_id">
            <tr class="order-row">
              <td v-if="role === 'worker'" class="ps-4 fw-bold">#{{ order.order_id }}</td>
              <td class="small text-muted">
                <span v-if="order.commit_date">
                  <i class="bi bi-calendar3 me-1"></i> {{ new Date(order.commit_date).toLocaleDateString('pl-PL') }}
                </span>
                <span v-else-if="order.status === 'CANCELLED'" class="text-danger fw-bold">Cancelled</span>
                <span v-else class="opacity-50">Pending</span>
              </td>

              <td v-if="role === 'worker'" class="text-center px-3">
                <div class="fw-bold small">{{ order.full_name }}</div>
                <div class="text-muted" style="font-size: 0.75rem;">{{ order.email }}</div>
              </td>

              <td class="text-center">
                <div class="position-relative">
                  <button
                      class="btn btn-sm btn-light border rounded-pill px-3"
                      type="button"
                      @click="toggleDropdown(order.order_id)"
                  >
                    Click to get
                    <i class="bi" :class="activeDropdown === order.order_id ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
                  </button>

                  <ul
                      v-if="activeDropdown === order.order_id"
                      class="dropdown-menu show shadow border-0 rounded-3 p-2 position-absolute"
                      style="display: block; z-index: 1050; left: 50%; transform: translateX(-50%); min-width: 200px;"
                  >
                    <li v-for="(item, idx) in order.items" :key="idx" class="small p-2 border-bottom last-no-border text-start">
                      <span class="badge bg-secondary me-1">{{ item.quantity }}x</span> {{ item.product }}
                    </li>
                  </ul>
                </div>
              </td>

              <td class="text-end fw-bold text-primary pe-3">${{ order.calculated_total.toFixed(2) }}</td>

              <td class="text-center">
                <span :class="['badge rounded-pill px-3 py-2',
                  order.status === 'COMPLETED' ? 'bg-success' :
                  order.status === 'CANCELLED' ? 'bg-danger' :
                  order.status === 'CONFIRMED' ? 'bg-info text-dark' : 'bg-primary']">
                  {{ order.status }}
                </span>
              </td>

              <td class="text-center pe-4">
                <div v-if="role === 'worker'" class="btn-group btn-group-sm rounded-pill overflow-hidden shadow-sm border">
                  <button v-if="order.status === 'UNCONFIRMED'" class="btn btn-warning border-0" @click="updateStatus(order.order_id, 'CONFIRMED')">Confirm</button>
                  <button v-if="['CONFIRMED'].includes(order.status)" class="btn btn-success border-0" @click="updateStatus(order.order_id, 'COMPLETED')">Done</button>
                  <button v-if="['UNCONFIRMED', 'CONFIRMED'].includes(order.status)"
                          class="btn border-0 transition-all"
                          :class="cancellingOrderId === order.order_id ? 'btn-danger' : 'btn-outline-danger'"
                          @click.stop="handleCancelClick(order.order_id)">
                    {{ cancellingOrderId === order.order_id ? 'Confirm?' : 'Cancel' }}
                  </button>
                </div>

                <div v-else-if="role === 'customer'" class="d-flex align-items-center justify-content-center gap-2">
                  <template v-if="order.status === 'UNCONFIRMED'">
                    <button class="btn btn-sm rounded-pill px-3 transition-all animate-shake"
                            :class="cancellingOrderId === order.order_id ? 'btn-danger shadow-lg' : 'btn-outline-danger'"
                            :disabled="actionLoading"
                            @click.stop="handleCancelClick(order.order_id)">
                      <i v-if="cancellingOrderId === order.order_id" class="bi bi-exclamation-triangle me-1"></i>
                      {{ cancellingOrderId === order.order_id ? 'Click again to cancel' : 'Cancel Order' }}
                    </button>
                  </template>

                  <button v-if="['COMPLETED', 'CANCELLED'].includes(order.status) && !opinions[order.order_id]"
                          class="btn btn-sm btn-primary rounded-pill px-3"
                          @click="openOpinionForm(order.order_id)">
                    Rate Order
                  </button>
                  <span v-if="opinions[order.order_id]" class="text-success small fw-bold">
                    <i class="bi bi-star-fill text-warning me-1"></i>Rated
                  </span>
                </div>
              </td>
            </tr>

            <tr v-if="opinions[order.order_id] || showOpinionForm === order.order_id" class="bg-light">
              <td colspan="7" class="py-4 px-5">
                <div v-if="opinions[order.order_id]" class="opinion-card p-4 rounded-4 shadow-sm bg-white border-start border-4 border-warning">
                  <div class="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
                    <div class="rating-stars">
                      <span v-for="i in 5" :key="i"
                            :class="['bi fs-5 me-1', i <= opinions[order.order_id].rating ? 'bi-star-fill text-warning' : 'bi-star text-muted opacity-25']">
                      </span>
                      <span class="ms-2 badge bg-light text-dark border">{{ opinions[order.order_id].rating }}/5</span>
                    </div>
                  </div>
                  <div class="opinion-text">
                    <i class="bi bi-quote text-primary opacity-25 fs-2"></i>
                    <span class="ms-2 text-dark italic fw-medium fs-5">"{{ opinions[order.order_id].content || 'No comment provided.' }}"</span>
                  </div>
                </div>

                <div v-else-if="showOpinionForm === order.order_id" class="opinion-form-card p-4 rounded-4 shadow-sm bg-white border">
                  <h6 class="mb-4 fw-bold"><i class="bi bi-chat-heart text-primary me-2"></i>Share your feedback</h6>
                  <div class="row align-items-end g-3">
                    <div class="col-auto">
                      <label class="form-label small fw-bold text-uppercase text-muted">Rating</label>
                      <select v-model="opinionForm.rating" class="form-select rounded-3 border-primary-subtle bg-light">
                        <option v-for="n in 5" :key="n" :value="n">{{ n }} ★</option>
                      </select>
                    </div>
                    <div class="col">
                      <label class="form-label small fw-bold text-uppercase text-muted">Your Comment</label>
                      <textarea v-model="opinionForm.content" class="form-control rounded-3 bg-light border-0" rows="1" placeholder="How was our service?"></textarea>
                    </div>
                    <div class="col-auto d-flex gap-2">
                      <button class="btn btn-primary rounded-pill px-4 shadow" @click="submitOpinion(order.order_id)" :disabled="actionLoading">Submit</button>
                      <button class="btn btn-light rounded-pill px-3 border" @click="showOpinionForm = null">X</button>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </template>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-in { animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1); }

.glass-alert { background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(10px); z-index: 9999;
  border: 1px solid rgba(255, 255, 255, 0.3); width: fit-content; min-width: 320px; border-radius: 50px; }

.order-row { transition: all 0.2s ease; }
.order-row:hover { background-color: rgba(13, 110, 253, 0.02); }

.w-fit-content { width: fit-content; }
.transition-all { transition: all 0.2s ease; }

.opinion-card { max-width: 700px; }
.opinion-form-card { max-width: 850px; }

.italic { font-style: italic; }
.last-no-border:last-child { border-bottom: none !important; }

@keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }

.table-container { overflow: visible !important; position: relative; }
.dropdown-menu.show { display: block; position: absolute; z-index: 9999; white-space: nowrap; }
</style>