import {callApi} from './api';


export const getStatus = () =>
    callApi('get', '/status');
