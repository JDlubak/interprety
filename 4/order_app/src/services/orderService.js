import {callApi} from './api';
import {authHeader} from './auth.js';

const PREFIX = '/orders'


export const getOrders = async (token) =>
    callApi('get', PREFIX, authHeader(token));

export const getOrdersByStatus = (id, token) =>
    callApi('get', `${PREFIX}/status/${id}`, authHeader(token));

export const createOrder = (data, token) =>
    callApi('post', PREFIX, data, authHeader(token));

export const changeOrderStatus = (id, data, token) =>
    callApi('patch', `${PREFIX}/${id}`, data, authHeader(token));

export const postOpinion = (id, data, token) =>
    callApi('post', `${PREFIX}/${id}/opinions`, data, authHeader(token));

export const getOpinion = (id, data, token) =>
    callApi('get', `${PREFIX}/${id}/opinions`, data, authHeader(token));
