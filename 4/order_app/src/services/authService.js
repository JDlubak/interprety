import {callApi} from './api';
import {authHeader} from './auth.js'


export const login = (data) =>
    callApi('post', '/login', data);

export const register = (data) =>
    callApi('post', '/register', data);

export const refreshToken = (data) =>
    callApi('post', '/refresh', data);

export const getProfile = (token) =>
    callApi('get', '/profile', null, authHeader(token));

