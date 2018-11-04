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


const rerankSearchResultsHandler = async (request, sendResponse) => {
  const rerankedOrder = await rerankSearchResults(request.data)
  sendResponse({ data: rerankedOrder });
};

const updateClickHandler = async payload => {
  await updateClick(payload);
};


// simulate search
var keywordsPools = [];
var simulateKeyword;
var simulateTab;
var simulateSearch = function() {
  const settings = getSettings();

  if (simulateTab) {
    return;
  }

  if (!keywordsPools.length) {
    return;
  }

  chrome.tabs.create({ url: 'https://www.google.com/', active: false }, tab => {
    simulateTab = tab;
    setTimeout(() => {
      chrome.tabs.remove(tab.id);
      if (simulateTab && simulateTab.id === tab.id) {
        simulateTab = undefined;
        simulateSearch();
      }
    }, settings.smlt_to * 1000);
  });
}

// post simulation data back to database
const onTabUpdateHandler = (tabId, changeInfo, tab) => {
  if (simulateTab && simulateTab.id === tabId && changeInfo.status && changeInfo.status === 'complete') {
    if (tab.url.indexOf('www.google.com') === -1) {
      try {
        chrome.tabs.remove(tab.id, function() {
          if (chrome.runtime.lastError) {} else {}
        });
      } catch (e) {}
      if (simulateTab && simulateTab.id === tab.id) {
        simulateTab = undefined;
        simulateSearch();
      }
    }
  }
}

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
      sendResponse(Boolean(simulateTab) && simulateTab.id === sender.tab.id);
      return;

    case 'GET_SIMULATE_QUERY':
      getSimulateQuery(sendResponse);
      return;

    case 'TRACK_SEARCH':
      handleSearch(request.payload);
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

const handleSearch = async query => {
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

  keywordsPools.push(...genQueries);
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
  chrome.tabs.onUpdated.addListener(onTabUpdateHandler);


  // check if user makes a google search every 5 seconds
  setInterval(() => {
    const settings = getSettings();
    if (!settings.started) return;

    simulateSearch();
  }, 5 * 1000);
}

main().catch(err => { throw err; });
