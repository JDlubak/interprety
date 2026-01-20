import axios from 'axios'

const API_URL = 'http://localhost:3000';

const api = axios.create({
    baseURL: API_URL,
    timeout: 5000,
    headers: {
        'Content-Type': 'application/json',
    }
});

const handleError = (err) => {
    console.log(err)
    if (err.response) {
        return Promise.reject(err.response.data.message || 'Server Error');
    } else if (err.request) {
        return Promise.reject('No response from server');
    } else {
        return Promise.reject(err.message);
    }
};


const callApi = async(method, url, data = null, config = {}) => {
    try {
        const response = data
            ? await api[method](url, data, config)
            : await api[method](url, config);
        return response.data;
    } catch (error) {
        return handleError(error);
    }
}


export { handleError, api, callApi };