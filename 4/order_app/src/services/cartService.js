import { ref } from 'vue';

export const cart = ref([]);

export const addToCart = (product, quantity) => {
    const existing = cart.value.find(item => item.id === product.id);
    if (!quantity || quantity <= 0) return;
    if (existing) {
        existing.quantity += quantity;
    } else {
        cart.value.push({...product, quantity: quantity});
    }
};

export const removeFromCart = (productId) => {
    cart.value = cart.value.filter(item => item.id !== productId);
};

export const clearCart = () => {
    cart.value = [];
}

export const setQuantity = (productId, quantity) => {
    const existing = cart.value.find(item => item.id === productId);
    if (!existing) return;
    if (quantity < 0) {
        removeFromCart(productId);
    } else {
        existing.quantity = quantity;
    }

}