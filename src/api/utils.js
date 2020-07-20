// utils to delay promise
export function wait(ms) {
    return (x) => {
        return new Promise(resolve => setTimeout(() => resolve(x), ms));
    };
}

import axios from 'axios';

export const http = axios.create({
    baseURL: 'https://api.domen.com/',
});
const cancelToken = axios.CancelToken;



export let cancelSource = cancelToken.source();
export const refreshToken = (() => {
    cancelSource = cancelToken.source();
});
export const cancelAllRequests = (() => {
    cancelSource.cancel();
});
