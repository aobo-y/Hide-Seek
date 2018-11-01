import axios from 'axios';
import uuidv4 from 'uuid/v4';

import config from '../config.js';

const {apihost} = config;

const apiInstance = axios.create({
  baseURL: apihost,
  url: '/QueryGenerator'
})

async function callApi(method, params, data) {
  const response = await apiInstance({
    method,
    params,
    data
  });

  return response.data;
}

export const createUser = async () => {
  const uuid = uuidv4();
  await callApi('post', {
    action: 'R',
    uid: uuid
  });
  return uuid;
};

// previous implementer terribly designed this function
// pass array as form with jquery... huge mistake
// keep it for now
export const rerankSearchResults = async (uuid, results = []) => {
  // request.data is like [snippet1, snippet2, ...]
  const body = new URLSearchParams();
  for (let r of results) {
    body.append('json[]', r);
  }

  return await callApi('post', {
    action: 'U',
    uid: uuid
  }, body);
};

export const updateClick = async (uuid, {
  query,
  click,
  url,
  content,
  snip
}) => {
  return await callApi('post', {
    action: 'UC',
    uid: uuid,
    query,
    click,
    url,
    content,
    snip
  });
}

export const simulateClick = async (uuid, {
  query,
  click,
  url,
  content
}) => {
  return await callApi('post', {
    action: 'SC',
    uid: uuid,
    query,
    click,
    url,
    content
  });
}

export const queryKeywords = async (uuid, {
  query,
  numcover,
}) => {
  return await callApi('post', {
    action: 'Q',
    uid: uuid,
    query,
    numcover
  });
}
