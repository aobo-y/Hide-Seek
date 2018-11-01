import $ from 'jquery';
import store from 'store';

import {
  createUser,
  rerankSearchResults,
  updateClick,
  simulateClick,
  queryKeywords
} from './lib/api';

var popupSettings = store.get('popupSettings') || {};
var userTopics = store.get('userTopics') || {};
var generatedTopics = store.get('generatedTopics') || {};
var last_user_topic = store.get('lut') || undefined;
var last_generated_topics = store.get('lgt') || [];
var userQueries = store.get("userQuery") || {};
var generatedQueries = store.get("generatedQuery") || {};


// _shared to viz page
window._shared = {};
window._shared.userTopics = userTopics;
window._shared.generatedTopics = generatedTopics;
window._shared.userQueries = userQueries;
window._shared.generatedQueries = generatedQueries;
window._shared.popupSettings = popupSettings;
window._shared.last_user_topic = last_user_topic;
window._shared.last_generated_topics = last_generated_topics;


var rank = 0;

const onMessageHandler = (request, sender, sendResponse) => {
  // check content type
  switch (request.action) {
    case 'A':
      checkContentType(request, sendResponse);
      return true;

    case 'R':
      // check if rerank feature is on
      sendResponse({ status: popupSettings.rerank });
      return;

    case 'U':
      rerankSearchResultsHandler(request, sendResponse);
      return true;

    case 'UC':
      if (!popupSettings.started) return;

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
  const rerankedOrder = await rerankSearchResults(popupSettings.uuid, request.data)
  sendResponse({ data: rerankedOrder });
}

const updateClickHandler = async request => {
  await updateClick(popupSettings.uuid, {
    query: request.keyword,
    click: request.index + 1,
    url: request.url,
    content: request.title,
    snip: request.content
  });
}




var savePopupSettings = function(settings) {
  store.set('popupSettings', settings);
}


var saveTopics = function() {
  store.set('userTopics', userTopics);
  store.set('generatedTopics', generatedTopics);
}

var addTopic = function(topicCollection, topic) {
  if (topicCollection.hasOwnProperty(topic)) {
    topicCollection[topic] += 1;
  } else {
    topicCollection[topic] = 1;
  }
  saveTopics();
}


var saveLastTopics = function() {
  store.set('lut', last_user_topic);
  store.set('lgt', last_generated_topics);
}

var saveQueries = function() {
  store.set("userQuery", userQueries);
  store.set("generatedQuery", generatedQueries);
}

var addQuery = function(queryCollection, query) {
  var splits = query.split(" ");
  $.each(splits, function(index, value) {
    if (value != ""){
      if (queryCollection.hasOwnProperty(value)) {
        queryCollection[value] += 1;
      } else {
        queryCollection[value] = 1;
      }
    }
  })
  saveQueries();
}



// simulate search
var keywordsPools = [];
var simulateKeyword;
var simulateTab;
var simulateSearch = function() {
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
    }, popupSettings.smlt_to * 1000);
  });
}

// post simulation data back to database
const onTabUpdateHandler = (tabId, changeInfo, tab) => {
  var title = changeInfo.title;
  if (simulateTab && simulateTab.id === tabId && changeInfo.status && changeInfo.status === 'complete') {
    // if (simulateTab && simulateTab.id === tabId && title) {
    if (tab.url.indexOf('www.google.com') == -1) {
      simulateClick(popupSettings.uuid, {
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
  if (data.q != undefined) {
    var q = data.q;
    if (lastSearch != q) {
      lastSearch = q;
      if (popupSettings.started) {
        const keywords = await queryKeywords(popupSettings.uuid, {
          query: q,
          numcover: popupSettings.numcover
        });

        last_generated_topics = [];

        Object.keys(keywords).forEach(key => {
          const val = keywords[key];

          if (key == "input") {
            last_user_topic = val;
            addTopic(userTopics, val);
            addQuery(userQueries, q.replace(/[^A-Za-z0-9]/g, ' '));
          } else {
            keywordsPools = keywordsPools.concat(key);
            last_generated_topics.push(val);
            addTopic(generatedTopics, val);
            addQuery(generatedQueries, key);
          }
          saveTopics();
          saveLastTopics();
          saveQueries();
        });
      }
    }
  }
}


async function main() {
  if (!popupSettings.uuid) {
    Object.assign(popupSettings, {
      started: true,
      rerank: true,
      uuid: await createUser(),
      date: new Date(),
      numcover: 4,
      smlt_to: 15
    });
    savePopupSettings(popupSettings);
  }

  chrome.runtime.onMessage.addListener(onMessageHandler);
  chrome.extension.onRequest.addListener(onRequestHandler);
  chrome.tabs.onUpdated.addListener(onTabUpdateHandler);

  savePopupSettings(popupSettings);
  saveTopics();
  saveLastTopics();
  saveQueries();

  // check if user makes a google search every 5 seconds
  setInterval(() => {
    if (!popupSettings.started) return;

    simulateSearch();
  }, 5 * 1000);
}

main();
