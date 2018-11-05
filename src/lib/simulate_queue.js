

const queue = []

let currentJob;

const simulateQueue = {};

simulateQueue.active = false;
simulateQueue.tabId = null;

const delay = mili => {
  return new Promise(res => {
    setTimeout(res, mili);
  });
}


function ctrledTabReadyHandler(request, sender, sendResponse) {
  if (request.action !== 'CT_READY') return;
  console.log('received', JSON.stringify(request))

  switch (currentJob.stage) {
    case 0:
      console.log(currentJob)

      sendResponse({
        action: 'CT_SEARCH_QUERY',
        payload: currentJob.query
      });
      break;

    case 1:
      console.log(currentJob)

      sendResponse({
        action: 'CT_SIMULATE_CLICK',
        payload: currentJob.query
      });
      break;

    case 2:
      console.log(currentJob)

      nextJob()
      return;

    default:
      break;
  }

  currentJob.stage++;
}

chrome.runtime.onMessage.addListener(ctrledTabReadyHandler);


function startQueue() {
  if (!queue.length) return;

  simulateQueue.active = true;


  chrome.tabs.create({ url: 'chrome-search://local-ntp/local-ntp.html', active: false }, tab => {
    simulateQueue.tabId = tab.id;
    nextJob();
  });
}

function nextJob() {
  if (!queue.length) {
    currentJob = null;
    simulateQueue.active = false;
    chrome.tabs.remove(simulateQueue.tabId);
    return;
  }

  const newJob = {
    query: queue.shift(),
    stage: 0
  };

  currentJob = newJob;

  setTimeout(() => {
    if (currentJob === newJob) {
      console.error('simulate job timeout:', JSON.stringify(currentJob));
      nextJob();
    }
  }, 30 * 1000);

  chrome.tabs.update(simulateQueue.tabId, {
    url: 'https://www.google.com'
  });
}

simulateQueue.put = jobs => {
  if (!Array.isArray(jobs)) {
    jobs = [jobs];
  }

  queue.push(...jobs);

  if (!simulateQueue.active) {
    startQueue();
  }
};


export default simulateQueue;
