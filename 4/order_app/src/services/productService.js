import {callApi} from './api';

const PREFIX = '/products'


export const getProducts = () =>
    callApi('get', PREFIX);

export const getProductSeoDescription = (id) =>
    callApi('get', `${PREFIX}/${id}/seo-description`);

export const createProduct = (data) =>
    callApi('post', PREFIX, data);

export const updateProduct = (id, data) =>
    callApi('put', `${PREFIX}/${id}`, data);

export const initProductDatabase = (data) =>
    callApi('post', 'init', data);

