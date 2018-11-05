import {getSettings} from './lib/state';
import userSearch from './lib/user_search';
import ctrlSearch from './lib/ctrl_search';
import {getProvider} from './lib/providers';


import './styles/content.css';

const url = location.href;
const settings = getSettings();


function checkIsCtrledTab() {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({ action: 'IS_CTRLED_TAB'}, res => {
      resolve(res);
    });
  });
}


async function main() {
  if (!settings.started) return;

  const isCtrledTab = await checkIsCtrledTab();
  const provider = getProvider(location.href);

  if (isCtrledTab) {
    ctrlSearch.init(provider);
  } else if (provider && provider.inSearchResults()) {
    userSearch.init(provider);
  }
}

main();

