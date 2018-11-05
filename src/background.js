import {
  createUser,
  rerankSearchResults,
  updateClick,
  simulateClick,
  queryKeywords
} from './lib/api';

import {
  getUser,
  updateUser,
  getSettings,
  patchUserTopics,
  patchUserQueries,
  patchGenTopics,
  patchGenQueries,
  updateLastSearch
} from './lib/state';

import simulateQueue from './lib/simulate_queue';

const rerankSearchResultsHandler = async (request, sendResponse) => {
  const rerankedOrder = await rerankSearchResults(request.data)
  sendResponse({ data: rerankedOrder });
};

const updateClickHandler = async payload => {
  await updateClick(payload);
};


function getSimulateQuery(sendResponse) {
  sendResponse(keywordsPools.shift())
}

const onMessageHandler = (request, sender, sendResponse) => {
  switch (request.action) {
    case 'U':
      rerankSearchResultsHandler(request, sendResponse);
      return true;

    case 'TRACK_SEARCH_CLICK':
      updateClickHandler(request.payload);
      return;

    case 'IS_CTRLED_TAB':
      sendResponse(simulateQueue.tabId === sender.tab.id);
      return;

    case 'GET_SIMULATE_QUERY':
      getSimulateQuery(sendResponse);
      return;

    case 'TRACK_SEARCH':
      trackSearch(request.payload);
      return;

    case 'SIMULATE_CLICK':
      simulateClick(request.payload);
      return;

    default:
      return;
  }
}


// handle the search
var lastSearch;

const trackSearch = async query => {
  const settings = getSettings();
  if (!settings.started) return;

  if (!query) return;
  if (query === lastSearch) return;

  lastSearch = query;
  const keywords = await queryKeywords({
    query,
    numcover: settings.numcover
  });

  const topic = keywords.input;
  patchUserTopics(topic);
  patchUserQueries(query.replace(/[^A-Za-z0-9]/g, ' '));

  const genQueries = Object.keys(keywords).filter(k => k !== 'input');
  const genTopics = genQueries.map(q => keywords[q]);
  patchGenTopics(genTopics);
  patchGenQueries(genQueries);

  updateLastSearch(topic, genTopics);

  simulateQueue.put(genQueries);
}

// temporary test
function allowFrame() {
  chrome.webRequest.onHeadersReceived.addListener(details => {
    var headers = details.responseHeaders.filter(header => {
      const name = header.name.toLowerCase();
      return ![
        'x-frame-options',
        'frame-options',
        'content-security-policy'
      ].includes(name);
    });

    return {responseHeaders: headers};
  }, {
    urls: [ '*://*/*' ], // Pattern to match all http(s) pages
    types: [ 'sub_frame' ]
  },
  ['blocking', 'responseHeaders']);

  const a = document.createElement('iframe');
  a.setAttribute('src', 'https://www.google.com');
  a.setAttribute('styles', 'width: 800px;height: 900px;');
  document.body.append(a);
}

async function main() {
  // create user at init
  if (!getUser()) {
    const uid = await createUser()
    updateUser(uid);
  }

  // allowFrame();
  chrome.runtime.onMessage.addListener(onMessageHandler);
}

main().catch(err => { throw err; });
