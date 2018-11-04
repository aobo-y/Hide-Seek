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

var rank = 0;

const onMessageHandler = (request, sender, sendResponse) => {
  switch (request.action) {
    case 'U':
      rerankSearchResultsHandler(request, sendResponse);
      return true;

    case 'UC':
      updateClickHandler(request.payload);
      return;

    default:
      return;
  }
}

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

  if (!keywordsPools || !keywordsPools.length) {
    return;
  }

  simulateKeyword = keywordsPools[0];
  keywordsPools = keywordsPools.slice(1);
  console.log('simulateKeyword:');
  console.log('<<< ', simulateKeyword, ' >>>');
  chrome.tabs.create({ url: 'https://www.google.com/', active: false }, function(tab) {
    simulateTab = tab;
    setTimeout(function() {
      chrome.tabs.remove(tab.id, function() {
        if (chrome.runtime.lastError) {} else {}
      });
      if (simulateTab && simulateTab.id === tab.id) {
        simulateTab = undefined;
        simulateSearch();
      }
    }, settings.smlt_to * 1000);
  });
}

// post simulation data back to database
const onTabUpdateHandler = (tabId, changeInfo, tab) => {
  var title = changeInfo.title;
  if (simulateTab && simulateTab.id === tabId && changeInfo.status && changeInfo.status === 'complete') {
    // if (simulateTab && simulateTab.id === tabId && title) {
    if (tab.url.indexOf('www.google.com') == -1) {
      simulateClick({
        query: simulateKeyword,
        click: rank,
        url: tab.url,
        content: tab.title
      });

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



const onRequestHandler = (request, sender, sendResponse) => {
  switch (request.handler) {
    // simulate acquired keywords
    case 'simulate_keyword':
      sendResponse({ keyword: simulateKeyword });
      break;

    case 'handle_search':
      if (simulateTab && simulateTab.id === sender.tab.id) {
        sendResponse({ simulate: true });
      } else {
        sendResponse({ simulate: false });
        handleSearch(request.query);
      }
      break;

    default:
      break;
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


async function main() {
  // create user at init
  if (!getUser()) {
    const uid = await createUser()
    updateUser(uid);
  }

  chrome.runtime.onMessage.addListener(onMessageHandler);
  chrome.extension.onRequest.addListener(onRequestHandler);
  chrome.tabs.onUpdated.addListener(onTabUpdateHandler);


  // check if user makes a google search every 5 seconds
  setInterval(() => {
    const settings = getSettings();
    if (!settings.started) return;

    simulateSearch();
  }, 5 * 1000);
}

main().catch(err => { throw err; });
