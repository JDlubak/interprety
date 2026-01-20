import { createRouter, createWebHistory } from 'vue-router';
import LoginView from '../views/LoginView.vue';
import HomeView from "../views/HomeView.vue";
import ProductView from "../views/ProductView.vue";
import CartView from "../views/CartView.vue";

const routes = [
    { path: '/login', name: 'Login', component: LoginView },
    { path: '/', name: 'Home', component: HomeView, meta: { requiresAuth: true }},
    { path: '/products', name: 'Products', component: ProductView, meta: { requiresAuth: true }},
    { path: '/cart', name: 'Cart', component: CartView, meta: { requiresAuth: true }},
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

router.beforeEach((to, from, next) => {
    const token = localStorage.getItem('accessToken');
    if (to.meta.requiresAuth && !token) {
        next('/login');
    } else {
        next();
    }
});

export default router;