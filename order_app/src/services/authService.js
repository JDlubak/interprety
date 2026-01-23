import {callApi} from './api';


export const login = (data) =>
    callApi('post', '/login', data);

export const register = (data) =>
    callApi('post', '/register', data);

export const getProfile = () =>
    callApi('get', '/profile');

