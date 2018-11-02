import store from 'store';

// uid
export const getUser = () => {
  return store.get('user');
}

export const updateUser = uid => {
  const user = {
    uid,
    date: new Date()
  };
  store.set('user', user);
  return user;
}

// Settings
export const getSettings = () => {
  const settings = store.get('settings') || {};
  return {
    started: true,
    rerank: true,
    numcover: 4,
    smlt_to: 15,
    ...settings
  };
}

export const patchSettings = patch => {
  const settings = getSettings();
  const newSettings = {
    ...settings,
    ...patch
  };
  store.set('settings', newSettings);
  return newSettings;
}

// User Searches
export const getUserTopics = () => {
  return store.get('userTopics') || {};
}

export const patchUserTopics = topic => {
  const topics = getUserTopics();
  if (!topics[topic]) topics[topic] = 0;
  topics[topic]++;
  store.set('userTopics', topics);
  return topics;
}

export const getUserQueries = () => {
  return store.get('userQueries') || {};
}

export const patchUserQueries = queryString => {
  const queries = getUserQueries();
  queryString.split(' ').forEach(q => {
    if (!queries[q]) queries[q] = 0;
    queries[q]++;
  });
  store.set('userQueries', queries);
  return queries;
}

// Generated Searches
export const getGenTopics = () => {
  return store.get('genTopics') || {};
}

export const patchGenTopics = topic => {
  const topics = getGenTopics();
  if (!topics[topic]) topics[topic] = 0;
  topics[topic]++;
  store.set('genTopics', topics);
  return topics;
}

export const getGenQueries = () => {
  return store.get('genQueries') || {};
}

export const patchGenQueries = queryString => {
  const queries = getGenQueries();
  queryString.split(' ').forEach(q => {
    if (!queries[q]) queries[q] = 0;
    queries[q]++;
  });
  store.set('genQueries', queries);
  return queries;
}

// last search
export const getLastSearch = () => {
  const lastSearch = store.get('lastSearch') || {};
  return {
    userTopic: null,
    genTopics: [],
    ...lastSearch
  };
}

export const updateLastSearch = (userTopic, genTopics) => {
  const lastSearch = {
    userTopic,
    genTopics
  };
  store.set('lastSearch', lastSearch);
  return lastSearch;
}
