import {getSettings} from './lib/state';

import './styles/content.css';

const settings = getSettings();
const href = location.href;

function getQuery() {
  const params = new URLSearchParams(href);
  return params.get('q');
}

function doSearch(keyword) {
  const input = document.getElementsByClassName('gLFyf gsfi')[0];
  const submit = document.getElementsByName('btnK')[0];
  input.value = keyword;
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
      action: "UC",
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
  linkList[simulateIndex].click();
}


function main() {
  if (!settings.started) return;

  if (href === 'https://www.google.com/') {
    // this page is google homepage
    chrome.extension.sendRequest({ handler: 'handle_search' }, hResult => {
      console.log('result', hResult);

      if (!hResult || !hResult.simulate) return;

      chrome.extension.sendRequest({ handler: 'simulate_keyword' }, sResult => {
        if (!sResult.keyword) return;
        doSearch(sResult.keyword);
      });
    });
  } else {
    const query = getQuery();)

    if (!query) return;

    chrome.extension.sendRequest({ handler: 'handle_search', query }, result => {
      if (result && result.simulate) {
        simulateClick();
      } else {
        initClickTrack();

        // current page is user search page
        if (!settings.rerank) return;
        initRerank();
      }
    });
  }
}

main();

