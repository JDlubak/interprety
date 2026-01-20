import {callApi} from './api';
import {authHeader} from './auth.js';

const PREFIX = '/products'


export const getProducts = () =>
    callApi('get', PREFIX);

export const getProductById = (id) =>
    callApi('get', `${PREFIX}/${id}`);

export const getProductSeoDescription = (id) =>
    callApi('get', `${PREFIX}/${id}/seo-description`);

export const createProduct = (data, token) =>
    callApi('post', PREFIX, data, authHeader(token));

export const updateProduct = (id, data, token) =>
    callApi('put', `${PREFIX}/${id}`, data, authHeader(token));

export const initProductDatabase = (data, token) =>
    callApi('post', 'init', data, authHeader(token));

