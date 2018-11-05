
import google from './google';
import bing from './bing';

export {google, bing};

export function getProvider(url) {
  if (
    url.includes('https://www.google.com')
  ) {
    return google;
  } else if (url.includes('https://www.bing.com')) {
    return bing;
  }
}



