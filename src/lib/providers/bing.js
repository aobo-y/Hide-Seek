const NAME = 'bing';

function _onQueryChange(callback) {
  const form = document.querySelector('#sb_form');
  form.addEventListener('submit', callback);
}

function initSearchTrack(searchCallback) {
  searchCallback(getQuery(), NAME);

  _onQueryChange(() => {
    searchCallback(getQuery(), NAME);
  });
}

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
  // reinit when query changes
  _onQueryChange(() => {
    const cont = document.querySelector('.sb_count').textContent;
    // pooling to check if page is indeed updated
    const interval = setInterval(() => {
      const newCont = document.querySelector('.sb_count').textContent;
      if (newCont !== cont) {
        initRerank(getRerank);
        clearInterval(interval);
      }
    }, 1000);
  });


  const block = document.querySelector('#b_results');
  const items = Array.from(document.querySelectorAll('#b_results li.b_algo'));
  const snippets = items.map(i => {
    const p = i.querySelector('.b_caption p');
    if (p) return p.textContent;

    const lc = i.querySelector('div.lisn_content');
    if (lc) return lc.textContent;

    return '';
  });

  getRerank(snippets, newOrder => {
    const sortedItems = [...items].sort(function(a, b) {
      return newOrder[items.indexOf(a)] - newOrder[items.indexOf(b)];
    });

    const rerankBtn = document.createElement('input');
    rerankBtn.setAttribute('class', 'HS-rerank-btn');
    rerankBtn.setAttribute('type', 'button');
    rerankBtn.setAttribute('value', 'rerank results');

    rerankBtn.onclick = () => {
      let i = 0;
      const newChildren = Array.from(block.children).map(c => {
        if (c.className.includes('b_algo')) {
          return sortedItems[i++];
        }
        return c;
      });

      newChildren.forEach(child => {
        block.append(child);
      });

      rerankBtn.toggleAttribute('disabled');
    };

    const resultStats = document.querySelector('#b_tween');
    resultStats.append(rerankBtn);
  });
};

function getSimulateAnchors() {
  // if the link leads to files, like pdf & ppt
  // the 1st child is a span
  // otherwise anchor
  return Array.from(document.querySelectorAll('.b_algo h2'))
    .filter(ele => !ele.previousSibling ||  ele.previousSibling.tagName !== 'SPAN')
    .map(ele => ele.querySelector(':scope > a'));
}

function doSearch(query) {
  const input = document.querySelector('input.b_searchbox');
  const submit = document.querySelector('input.b_searchboxSubmit');
  input.value = query;
  submit.click();
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
  name: NAME,
  initSearchTrack,
  initClickTrack,
  initRerank,
  getSimulateAnchors,
  doSearch,
  getQuery,
  inSearchResults
};
