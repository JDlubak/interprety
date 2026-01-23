import { ref, watch } from 'vue';

const STORAGE_KEY = import.meta.env.VITE_STORAGE_KEY;

const loadInitialCart = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
};

export const cart = ref(loadInitialCart());

watch(cart, (newCartValue) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newCartValue));
}, { deep: true });

export const addToCart = (product, quantity) => {
    const existing = cart.value.find(item => item.id === product.id);
    if (!quantity || quantity <= 0) return;
    if (existing) {
        existing.quantity += quantity;
    } else {
        cart.value.push({
            id: product.id,
            product: product.product || product.name,
            price: product.price,
            quantity: quantity
        });
    }
};

export const removeFromCart = (productId) => {
    cart.value = cart.value.filter(item => item.id !== productId);
};

export const clearCart = () => {
    cart.value = [];
    localStorage.removeItem(STORAGE_KEY);
}

export const setQuantity = (productId, quantity) => {
    const existing = cart.value.find(item => item.id === productId);
    if (!existing) return;
    if (quantity <= 0) {
        removeFromCart(productId);
    } else {
        existing.quantity = quantity;
    }
}