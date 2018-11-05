
import {getSettings} from './state';

const settings = getSettings();


// send user click info
function sendSearchClick(searchClick) {
  chrome.runtime.sendMessage({
    action: "TRACK_SEARCH_CLICK",
    payload: {
      ...searchClick,
      click: 0 // no idea wt it is
    }
  });
}

function sendRerankSnippets(snippets, callback) {
  chrome.runtime.sendMessage({
    action: 'RERANK_RESULTS',
    payload: snippets
  }, callback);
}


function init(provider) {
  chrome.runtime.sendMessage({
    action: 'TRACK_SEARCH',
    payload: {
      query: provider.getQuery(),
      provider: provider.name
    }
  });

  provider.initClickTrack(sendSearchClick);
  if (!settings.rerank) return;
  provider.initRerank(sendRerankSnippets);
}

export default {init};
