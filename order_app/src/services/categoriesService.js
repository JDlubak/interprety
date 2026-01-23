import {callApi} from './api';


export const getCategories = () =>
    callApi('get', '/categories');
