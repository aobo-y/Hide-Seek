import $ from 'jquery';
import store from 'store';

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

let uid = null;

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
  const rerankedOrder = await rerankSearchResults(uid, request.data)
  sendResponse({ data: rerankedOrder });
}

const updateClickHandler = async request => {
  await updateClick(uid, {
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
      simulateClick(uid, {
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
        handleSearch(request);
      }
      break;

    default:
      break;
  }
}


// handle the search
var lastSearch;

const handleSearch = async (data, callback, sender) => {
  const settings = getSettings();

  if (data.q != undefined) {
    var q = data.q;
    if (lastSearch != q) {
      lastSearch = q;
      if (settings.started) {
        const keywords = await queryKeywords(uid, {
          query: q,
          numcover: settings.numcover
        });

        let topic;
        let genTopics = [];

        Object.keys(keywords).forEach(key => {
          const val = keywords[key];

          if (key == "input") {
            topic = val;
            patchUserTopics(val);
            patchUserQueries(q.replace(/[^A-Za-z0-9]/g, ' '));
          } else {
            keywordsPools = keywordsPools.concat(key);
            genTopics.push(val);

            patchGenTopics(val);
            patchGenQueries(key);
          }
        });
        updateLastSearch(topic, genTopics);
      }
    }
  }
}


async function main() {
  let user = getUser()
  if (!user) {
    uid = await createUser()
    user = updateUser(uid);
  }
  uid = user.uid;

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
