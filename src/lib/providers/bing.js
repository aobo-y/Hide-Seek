

// send user click info
function initClickTrack(trackCallback) {
  const linkOnClickHandler = evt => {
    const anchor = evt.currentTarget;
    const url = anchor.getAttribute('href');

    const title = anchor.textContent;
    const content = anchor.closest('li').querySelector('p').textContent;

    trackCallback({
      query,
      url,
      title,
      content
    });
  };

  Array.from(document.querySelectorAll('.b_algo > h2 > a')).forEach(a => {
    a.addEventListener('click', linkOnClickHandler);
  });
};


function initRerank(getRerank) {
  // const blocks = Array.from(document.querySelectorAll('div.srg'));
  // const itemsByBlocks = blocks
  //   .map(b => Array.from(b.querySelectorAll(':scope > div.g')));
  // const blockLength = itemsByBlocks.map(ib => ib.length);
  // const items = itemsByBlocks.reduce((prev, curr) => prev.concat(curr));
  // const snippets = items.map(i => i.querySelector('span.st').textContent);

  // getRerank(snippets, newOrder => {
  //   const sortedItems = [...items].sort(function(a, b) {
  //     return newOrder[items.indexOf(a)] - newOrder[items.indexOf(b)];
  //   });

  //   const rerankBtn = document.createElement('input');
  //   rerankBtn.setAttribute('class', 'HS-rerank-btn');
  //   rerankBtn.setAttribute('type', 'button');
  //   rerankBtn.setAttribute('value', 'rerank results');

  //   rerankBtn.onclick = () => {
  //     let startIndex = 0;
  //     blocks.forEach((block, index) => {
  //       const length = blockLength[index];
  //       sortedItems.slice(startIndex, length).forEach(item => {
  //         block.append(item);
  //       });

  //       startIndex = length;
  //     });

  //     rerankBtn.toggleAttribute('disabled');
  //   };

  //   const resultStats = document.querySelector('#resultStats');
  //   resultStats.append(rerankBtn);
  // });
};

function getSimulateAnchors() {
  // if the link leads to files, like pdf & ppt
  // the 1st child is a span
  // otherwise anchor
  // return Array.from(document.querySelectorAll('.b_algo h2'))
  //   .filter(ele => !ele.previousSibling ||  ele.previousSibling.tagName !== 'SPAN')
  //   .map(ele => ele.querySelector(':scope > a'));
}

function doSearch(query) {
  // const input = document.getElementsByClassName('gLFyf gsfi')[0];
  // const submit = document.getElementsByName('btnK')[0];
  // input.value = query;
  // submit.click();
}

function getQuery() {
  const qs = location.href.split('search?')[1]
  const params = new URLSearchParams(qs);
  return params.get('q');
}

function inSearchResults() {
  return location.href.indexOf('https://www.bing.com/search?') === 0;
}

export default {
  name: 'bing',
  initClickTrack,
  initRerank,
  getSimulateAnchors,
  doSearch,
  getQuery,
  inSearchResults
};
