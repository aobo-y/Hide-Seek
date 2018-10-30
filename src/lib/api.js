import axios from 'axios';

import config from '../config.js';

const {apihost} = config;

const apiInstance = axios.create({
  baseURL: apihost,
  url: '/QueryGenerator'
})

async function callApi(method, params) {
  const response = await apiInstance({
    method,
    params
  });

  return response.data;
}

export const createUser = async uuid => {
  return await callApi('post', {
    action: 'R',
    uid: uuid
  });
}
