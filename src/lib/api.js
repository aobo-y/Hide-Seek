import axios from 'axios';
import uuidv4 from 'uuid/v4';

import {getUser} from './state.js';
import config from '../config.js';

const {apihost} = config;

const apiInstance = axios.create({
  baseURL: apihost,
  url: '/QueryGenerator'
})

async function callApi(method, params, data) {
  if (!params.uid) {
    const user = getUser();
    params = {...params, uid: user.uid};
  }

  const response = await apiInstance({
    method,
    params,
    data
  });

  return response.data;
}

export const createUser = async () => {
  const uid = uuidv4();
  await callApi('post', {
    action: 'R',
    uid
  });
  return uid;
};

// previous implementer terribly designed this function
// pass array as form with jquery... huge mistake
// keep it for now
export const rerankSearchResults = async (results = []) => {
  // request.data is like [snippet1, snippet2, ...]
  const body = new URLSearchParams();
  for (let r of results) {
    body.append('json[]', r);
  }

  return await callApi('post', {
    action: 'U'
  }, body);
};

export const updateClick = async ({
  query,
  click,
  url,
  content,
  snip
}) => {
  return await callApi('post', {
    action: 'UC',
    query,
    click,
    url,
    content,
    snip
  });
}

export const simulateClick = async ({
  query,
  click,
  url,
  content
}) => {
  return await callApi('post', {
    action: 'SC',
    query,
    click,
    url,
    content
  });
}

export const queryKeywords = async ({
  query,
  numcover,
}) => {
  return await callApi('post', {
    action: 'Q',
    query,
    numcover
  });
}
