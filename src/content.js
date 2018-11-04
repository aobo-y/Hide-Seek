import {getSettings} from './lib/state';

import './styles/content.css';

const settings = getSettings();
const href = location.href;

function getQuery() {
  const params = new URLSearchParams(href);
  return params.get('q');
}

function doSearch(query) {
  const input = document.getElementsByClassName('gLFyf gsfi')[0];
  const submit = document.getElementsByName('btnK')[0];
  input.value = query;
  submit.click();
}

// send user click info
function initClickTrack() {
  const linkOnClickHandler = evt => {
    const anchor = evt.currentTarget;
    const url = anchor.getAttribute('href');

    const title = anchor.textContent;
    const content = anchor.closest('.r').parentElement
      .closest('div').querySelector('.st').textContent;

    chrome.runtime.sendMessage({
      action: "TRACK_SEARCH_CLICK",
      payload: {
        query,
        url,
        title,
        content,
        click: 0 // no idea wt it is
      }
    });
  };

  Array.from(document.querySelectorAll('#res .g .r > a')).forEach(a => {
    a.addEventListener('click', linkOnClickHandler);
  });
};

function initRerank() {
  const blocks = Array.from(document.querySelectorAll('div.srg'));
  const itemsByBlocks = blocks
    .map(b => Array.from(b.querySelectorAll(':scope > div.g')));
  const blockLength = itemsByBlocks.map(ib => ib.length);
  const items = itemsByBlocks.reduce((prev, curr) => prev.concat(curr));
  const snippets = items.map(i => i.querySelector('span.st').textContent);

  chrome.runtime.sendMessage({
    action: 'U',
    data: snippets
  }, response => {
    const newOrder = response.data;
    const sortedItems = [...items].sort(function(a, b) {
      return newOrder[items.indexOf(a)] - newOrder[items.indexOf(b)];
    });

    const rerankBtn = document.createElement('input');
    rerankBtn.setAttribute('class', 'HS-rerank-btn');
    rerankBtn.setAttribute('type', 'button');
    rerankBtn.setAttribute('value', 'rerank results');

    rerankBtn.onclick = () => {
      let startIndex = 0;
      blocks.forEach((block, index) => {
        const length = blockLength[index];
        sortedItems.slice(startIndex, length).forEach(item => {
          block.append(item);
        });

        startIndex = length;
      });

      rerankBtn.toggleAttribute('disabled');
    };

    const resultStats = document.querySelector('#resultStats');
    resultStats.append(rerankBtn);
  });
};

function simulateClick() {
  // if the link leads to files, like pdf & ppt
  // the 1st child is a span
  // otherwise anchor
  const linkList = Array.from(document.querySelectorAll('#res .g .r'))
    .map(ele => ele.children[0])
    .filter(ele => ele.tagName === 'A');

  if (!linkList.length) return;

  const simulateIndex  = Math.floor(Math.random() * linkList.length);
  const anchor = linkList[simulateIndex];

  chrome.runtime.sendMessage({
    action: 'SIMULATE_CLICK',
    payload: {
      query: getQuery(),
      click: 0,
      url: anchor.getAttribute('href'),
      title: anchor.textContent
    }
  });

  anchor.click();
}


function checkIsCtrledTab() {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({ action: 'IS_CTRLED_TAB'}, res => {
      resolve(res);
    });
  });
}

function getSimulateQuery() {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({ action: 'GET_SIMULATE_QUERY'}, res => {
      resolve(res);
    });
  });
}

function createWarning() {
  const warning = document.createElement('div');
  const wScreen = document.createElement('div');
  warning.setAttribute('class', 'HS-warning');
  wScreen.setAttribute('class', 'HS-warning-screen');
  warning.textContent = 'This Tab is controlled by Hide-Seek';
  document.body.append(wScreen);
  document.body.append(warning);
}

async function main() {
  if (!settings.started) return;

  const isCtrledTab = await checkIsCtrledTab();

  if (isCtrledTab) {
    createWarning();
  }

  if (isCtrledTab && href === 'https://www.google.com/') {
    // this page is google homepage
    const simQuery = await getSimulateQuery();
    if (!simQuery) return;
    doSearch(simQuery);
  } else if (href.indexOf('https://www.google.com/search?') !== -1) {
    const query = getQuery();

    if (!query) return;

    if (isCtrledTab) {
      simulateClick();
    } else {
      chrome.runtime.sendMessage({
        action: 'TRACK_SEARCH',
        payload: query
      });

      initClickTrack();
      if (!settings.rerank) return;
      initRerank();
    }
  }
}

main();

