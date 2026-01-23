import {callApi} from './api';

const PREFIX = '/orders'


export const getOrders = async () =>
    callApi('get', PREFIX);

export const createOrder = (data) =>
    callApi('post', PREFIX, data);

export const changeOrderStatus = (id, data) =>
    callApi('patch', `${PREFIX}/${id}`, data);

export const postOpinion = (id, data) =>
    callApi('post', `${PREFIX}/${id}/opinions`, data);

export const getOpinion = (id, data) =>
    callApi('get', `${PREFIX}/${id}/opinions`, data);
