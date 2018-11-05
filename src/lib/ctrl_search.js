

function createWarning() {
  const warning = document.createElement('div');
  const wScreen = document.createElement('div');
  warning.setAttribute('class', 'HS-warning');
  wScreen.setAttribute('class', 'HS-warning-screen');
  warning.textContent = 'This Tab is controlled by Hide-Seek';
  document.body.append(wScreen);
  document.body.append(warning);
}



function simulateClick(query, anchors) {
  if (!anchors.length) return;

  const simulateIndex  = Math.floor(Math.random() * anchors.length);
  const anchor = anchors[simulateIndex];

  chrome.runtime.sendMessage({
    action: 'SIMULATE_CLICK',
    payload: {
      query: query,
      click: 0,
      url: anchor.getAttribute('href'),
      title: anchor.textContent
    }
  });

  anchor.click();
}

function init(provider) {
  createWarning();

  chrome.runtime.sendMessage({ action: 'CT_READY'}, response => {


    switch (response.action) {
      case 'CT_SEARCH_QUERY':
        provider.doSearch(response.payload);
        break;

      case 'CT_SIMULATE_CLICK':
        const anchors = provider.getSimulateAnchors();
        const query = provider.getQuery();
        simulateClick(query, anchors);
        break;

      default:
        break;
    }
  });
}

export default {init};
