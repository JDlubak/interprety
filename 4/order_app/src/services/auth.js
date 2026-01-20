export const authHeader = (token) => ({
    headers: { Authorization: `Bearer ${token}` }
});

export const getRoleFromToken = (token) => {
    if (token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.role;
        } catch (e) {
            return null;
        }
    }
    return null;
}
