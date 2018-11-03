import $ from 'jquery';

import {getSettings} from './lib/state';

import './styles/content.css';

const href = location.href;

const getQueryString = () => {
  const params = new URLSearchParams(href);
  return params.get('q');
}

const doSearch = function(keyword) {
  const input = document.getElementsByClassName('gLFyf gsfi')[0];
  const submit = document.getElementsByName('btnK')[0];
  input.value = keyword;
  submit.click();
}

const initRerank = () => {
  const blocks = Array.from(document.querySelectorAll('div.srg'));
  const itemsByBlocks = blocks
    .map(b => Array.from(b.querySelectorAll(':scope > div.g')))
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
}

const trackSearchInfo = () => {
  const query = getQueryString();
  if (!query) return;

  chrome.extension.sendRequest({ handler: 'handle_search', query }, result => {
    if (result && result.simulate) {
      // if the link leads to files, like pdf & ppt
      // the 1st child is a span
      // otherwise anchor
      const linkList = Array.from(document.querySelectorAll('.g .rc > .r'))
        .map(ele => ele.children[0])
        .filter(ele => ele.tagName === 'A');

      if (!linkList.length) return;

      const simulateIndex  = Math.floor(Math.random() * linkList.length);
      linkList[simulateIndex].click();
    } else {
      // send user click info
      $('#res .g .r a').click(function() {
        var self = $(this);
        var url = self.attr('href');
        if (url.indexOf('/url?') == 0) {
          url = decodeURIComponent(getQueryString(url, 'url'));
        }

        var snip = $(this).parent().closest('div').find(".st").text();
        var title = self.text();
        var keyword = $('#lst-ib').val();

        chrome.runtime.sendMessage({
          action: "UC",
          content: snip,
          url: url,
          title: title,
          keyword: keyword,
          index: -1
        });
      });

      // current page is user search page
      const settings = getSettings();
      if (!settings.rerank) return;

      initRerank();
    }
  });
}


function main() {
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
    trackSearchInfo();
  }
}

main();

