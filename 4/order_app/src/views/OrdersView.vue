<script setup>
import {ref, onMounted, computed} from 'vue';
import {getOrders, changeOrderStatus} from '../services/orderService.js';
import {getRoleFromToken} from "../services/api.js";
import {useRouter} from 'vue-router';

const router = useRouter();
const role = getRoleFromToken(localStorage.getItem('accessToken'));

const rawOrders = ref([]);
const loading = ref(true);
const actionLoading = ref(false);
const statusFilter = ref('ALL');
const statusAlert = ref({message: '', type: 'success'});

const notify = (msg, type = 'success') => {
  statusAlert.value.message = msg;
  statusAlert.value.type = type;
  setTimeout(() => statusAlert.value.message = '', 5000);
};

const fetchOrders = async () => {
  loading.value = true;
  try {
    const data = await getOrders();
    rawOrders.value = data.message || [];
  } catch (err) {
    const error = err.response?.data?.message || err.message || String(err);
    const ignore = ["You don't have any orders!", "Record not found"];
    const shouldIgnore = ignore.some(msg => error.includes(msg));
    if (!shouldIgnore) {
      notify(errorMsg, 'danger');
    }
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
    await changeOrderStatus(orderId, {status: newStatusName});
    notify(`Order #${orderId} updated to ${newStatusName}`);
    await fetchOrders();
  } catch (err) {
    notify(err, 'danger');
  } finally {
    actionLoading.value = false;
  }
};

const confirmCancel = (orderId) => {
  if (confirm(`Are you sure you want to cancel order #${orderId}?`)) {
    updateStatus(orderId, 'CANCELLED');
  }
};

onMounted(fetchOrders);
</script>

<template>
  <div class="container mt-5 animate-in">
    <div class="d-flex align-items-center mb-4 border-bottom pb-3">
      <h2 class="me-auto mb-0"><i class="bi bi-receipt"></i> Orders Explorer</h2>
      <button class="btn btn-outline-secondary" @click="router.push('/')">Home</button>
    </div>

    <Transition name="fade">
      <div v-if="statusAlert.message"
           :class="['alert text-center shadow fixed-top mx-auto mt-3 w-50 alert-' + statusAlert.type]"
           style="z-index: 2000;">
        {{ statusAlert.message }}
      </div>
    </Transition>

    <div class="mb-4 d-flex gap-2 flex-wrap">
      <button v-for="s in ['ALL', 'UNCONFIRMED', 'CONFIRMED', 'COMPLETED', 'CANCELLED']"
              :key="s" @click="statusFilter = s"
              :class="['btn btn-sm rounded-pill px-3', statusFilter === s ? 'btn-dark' : 'btn-light border']">
        {{ s }}
      </button>
    </div>

    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary"></div>
    </div>

    <div v-else>
      <div v-if="filteredOrders.length === 0" class="text-center py-5 bg-light rounded shadow-sm border">
        <i class="bi bi-box-seam display-1 text-muted mb-3 d-block"></i>

        <div v-if="role === 'customer'">
          <h4 v-if="statusFilter === 'ALL'">You don't have any orders!</h4>
          <h4 v-else>You don't have any {{ statusFilter }} orders!</h4>
          <p class="text-muted" v-if="statusFilter === 'ALL'">Why don't make one now?</p>
          <router-link v-if="statusFilter === 'ALL'" to="/products" class="btn btn-primary mt-2">
            Order Now
          </router-link>
        </div>

        <div v-else-if="role === 'worker'">
          <h4 v-if="statusFilter === 'ALL'">No orders found in the system.</h4>
          <h4 v-else>No orders with status {{ statusFilter }} found.</h4>
          <p class="text-muted">New orders will appear here automatically.</p>
        </div>
      </div>

      <div v-else class="table-responsive shadow-sm rounded">
        <table class="table table-hover align-middle bg-white mb-0">
          <thead class="table-dark">
          <tr>
            <th>Order ID</th>
            <th>Date</th>
            <th v-if="role === 'worker'">Customer Info</th>
            <th>Products Ordered</th>
            <th class="text-end">Total Amount</th>
            <th class="text-center">Status</th>
            <th class="text-center">Actions</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="order in filteredOrders" :key="order.order_id">
            <td class="fw-bold">#{{ order.order_id }}</td>
            <td class="small">
              <span v-if="order.commit_date">
                {{ new Date(order.commit_date).toLocaleDateString('pl-PL') }}
              </span>
              <span v-else-if="order.status === 'CANCELLED'" class="text-danger fw-bold">
                Cancelled
              </span>
              <span v-else class="text-muted">
                Pending
              </span>
            </td>

            <td v-if="role === 'worker'">
              <div class="fw-bold">{{ order.full_name }}</div>
              <div class="small text-muted">{{ order.email }}</div>
            </td>

            <td>
              <ul class="list-unstyled mb-0 small">
                <li v-for="(item, idx) in order.items" :key="idx" class="border-bottom py-1 last-no-border">
                  <span class="badge bg-secondary me-1">{{ item.quantity }}x</span> {{ item.product }}
                </li>
              </ul>
            </td>

            <td class="text-end fw-bold text-primary">{{ order.calculated_total.toFixed(2) }} $</td>

            <td class="text-center">
              <span :class="['badge rounded-pill px-3',
                order.status === 'COMPLETED' ? 'bg-success' :
                order.status === 'CANCELLED' ? 'bg-danger' :
                order.status === 'CONFIRMED' ? 'bg-info text-dark' : 'bg-primary']">
                {{ order.status }}
              </span>
            </td>

            <td class="text-center">
              <div v-if="role === 'worker'" class="btn-group shadow-sm">
                <button v-if="order.status === 'UNCONFIRMED'"
                        class="btn btn-sm btn-warning"
                        @click="updateStatus(order.order_id, 'CONFIRMED')">Confirm
                </button>

                <button v-if="['UNCONFIRMED', 'CONFIRMED'].includes(order.status)"
                        class="btn btn-sm btn-success"
                        @click="updateStatus(order.order_id, 'COMPLETED')">Done
                </button>

                <button v-if="['UNCONFIRMED', 'CONFIRMED'].includes(order.status)"
                        class="btn btn-sm btn-danger"
                        @click="confirmCancel(order.order_id)">Cancel
                </button>
              </div>

              <div v-else-if="role === 'customer'">
                <button v-if="['UNCONFIRMED', 'CONFIRMED'].includes(order.status)"
                        class="btn btn-sm btn-outline-danger"
                        :disabled="actionLoading"
                        @click="confirmCancel(order.order_id)">
                  <i class="bi bi-x-circle"></i> Cancel Order
                </button>
                <span v-else class="text-muted small">No actions available</span>
              </div>

              <span v-else class="text-muted small italic">Locked</span>
            </td>
          </tr>
          </tbody>
        </table>
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

.last-no-border:last-child {
  border-bottom: none !important;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>