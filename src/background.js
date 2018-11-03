import $ from 'jquery';

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
  const settings = getSettings();

  // check content type
  switch (request.action) {
    case 'A':
      checkContentType(request, sendResponse);
      return true;

    case 'R':
      // check if rerank feature is on
      sendResponse({ status: settings.rerank });
      return;

    case 'U':
      rerankSearchResultsHandler(request, sendResponse);
      return true;

    case 'UC':
      if (!settings.started) return;

      updateClickHandler(request);
      return;

    default:
      return;
  }
}

const checkContentType = async (request, sendResponse) => {
  $.ajax({
    type: request.method,
    url: request.url,
    async: true
  }).done(function(message, text, jqXHR) {
    var type = jqXHR.getResponseHeader('Content-Type').split(";")[0];
    if (type == "text/html") {
      sendResponse({ status: "YES" });
      rank = request.rank + 1;
    } else {
      console.log("%%%%%%%% Cannot open type: " + type + " %%%%%%%%");
      sendResponse({ status: "NO" });
    }
  })
}

const rerankSearchResultsHandler = async (request, sendResponse) => {
  const rerankedOrder = await rerankSearchResults(request.data)
  sendResponse({ data: rerankedOrder });
}

const updateClickHandler = async request => {
  await updateClick({
    query: request.keyword,
    click: request.index + 1,
    url: request.url,
    content: request.title,
    snip: request.content
  });
}




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
