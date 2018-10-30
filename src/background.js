import $ from 'jquery';
import store from 'store';
import uuidv4 from 'uuid/v4'
import config from './config';
import {
  createUser,
  rerankSearchResults,
  updateClick,
  simulateClick,
  queryKeywords
} from './lib/api';

const {apihost} = config;

var toEightDigits = function(n) {
  var s = n.toString;
  return "0".repeat(8 - s.length) + s;
}

var generateUUID = function() {
  var uuid = uuidv4();

  // append user-id to database
  createUser(uuid);

  return uuid;
};

var rank = 0;
var userRank = 0;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
})

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



chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
  requestHandlers[request.handler](request, sendResponse, sender);
});

var requestHandlers = {};

/**
 * data storage
 */

// part 1: global setting including offswitch, user_id and starting date
var popupSettings = store.get('popupSettings') || {
  started: true,
  rerank: true,
  uuid: generateUUID(),
  date: new Date(),
  numcover: 4,
  smlt_to: 15
}

var savePopupSettings = function() {
  store.set('popupSettings', popupSettings);
  console.log("+++++++++++ GLOBAL VARIABLES SET ++++++++++");
  console.log("+ " + store.get('popupSettings').started + " ".repeat((40 - store.get('popupSettings').started.toString().length)) + "+");
  console.log("+ " + store.get('popupSettings').rerank + " ".repeat((40 - store.get('popupSettings').rerank.toString().length)) + "+");
  console.log("+ " + store.get('popupSettings').uuid + " ".repeat(4) + "+");
  console.log("+ " + store.get('popupSettings').date + " ".repeat(16) + "+");
  console.log("+ " + store.get('popupSettings').numcover + " ".repeat((40 - store.get('popupSettings').numcover.toString().length)) + "+");
  console.log("+ " + store.get('popupSettings').smlt_to + " ".repeat((40 - store.get('popupSettings').smlt_to.toString().length)) + "+");
  console.log("+++++++++++ GLOBAL VARIABLES SET ++++++++++");
}

savePopupSettings();

if (!popupSettings.uuid) {
  popupSettings.uuid = generateUUID();
  savePopupSettings();
}

// part 2: save topic history, for visualization.html
var userTopics = store.get('userTopics') || {};
var generatedTopics = store.get('generatedTopics') || {};

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

saveTopics();

// part 3: save topic history, for popup.html
var last_user_topic = store.get('lut') || undefined;
var last_generated_topics = store.get('lgt') || [];

var saveLastTopics = function() {
  store.set('lut', last_user_topic);
  store.set('lgt', last_generated_topics);
}

saveLastTopics();

//part 4: save queries, for visualization.html
var userQueries = store.get("userQuery") || {};
var generatedQueries = store.get("generatedQuery") || {};

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

saveQueries();

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
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
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
});


// _shared to viz page
window._shared = {};
window._shared.userTopics = userTopics;
window._shared.generatedTopics = generatedTopics;
window._shared.userQueries = userQueries;
window._shared.generatedQueries = generatedQueries;
window._shared.popupSettings = popupSettings;
window._shared.last_user_topic = last_user_topic;
window._shared.last_generated_topics = last_generated_topics;

// check if user makes a google search every 5 seconds
setInterval(function() {
  if (!popupSettings.started) {
    return;
  }
  simulateSearch();
}, 5 * 1000);

// simulate acquired keywords
requestHandlers.simulate_keyword = function(data, callback, sender) {
  callback({ keyword: simulateKeyword });
}

// handle the search
var lastSearch;

requestHandlers.handle_search = async (data, callback, sender) => {
  if (simulateTab && simulateTab.id === sender.tab.id) {
    return callback({ simulate: true });
  } else {
    callback({ simulate: false });
  }
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
        $.each(keywords, function(key, val) {
          console.log(key + ", " + val);
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
