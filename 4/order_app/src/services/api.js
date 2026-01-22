import axios from 'axios'

const API_URL = 'http://localhost:3000';

const api = axios.create({
    baseURL: API_URL,
    timeout: 5000,
    headers: {
        'Content-Type': 'application/json',
    }
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    if (token && !config._isRefreshRequest) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => Promise.reject(error));

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const isLoginRequest = originalRequest.url.includes('/login');

        if (error.response?.status === 401 && !originalRequest._retry && !originalRequest._isRefreshRequest && !isLoginRequest) {
            originalRequest._retry = true;

            try {
                const rt = localStorage.getItem('refreshToken');
                if (!rt) throw new Error("No refresh token");
                const res = await api.post('/refresh', { refreshToken: rt }, { _isRefreshRequest: true });
                const { accessToken } = res.data;
                localStorage.setItem('accessToken', accessToken);
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return api(originalRequest);
            } catch (refreshErr) {
                localStorage.clear();
                window.location.href = '/login';
                return Promise.reject(refreshErr);
            }
        }
        return handleError(error);
    }
);

export const handleError = (err) => {
    console.error("API Error Debug:", err);

    if (err.response && err.response.data) {
        const serverMessage = err.response.data.message || err.response.data.error || 'Server Error';
        return Promise.reject(serverMessage);
    } else if (err.request) {
        return Promise.reject('No response from server. Check your connection.');
    } else {
        return Promise.reject(err || 'An unknown error occurred');
    }
};


export const callApi = async(method, url, data = null, config = {}) => {
    try {
        const response = data
            ? await api[method](url, data, config)
            : await api[method](url, config);
        return response.data;
    } catch (error) {
        return handleError(error);
    }
}

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

