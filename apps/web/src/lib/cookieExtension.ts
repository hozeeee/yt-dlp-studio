import { BASE_PATH } from './api'

/** "Get cookies.txt LOCALLY": open source and exports without sending cookies anywhere */
export const EXTENSIONS = [
  { label: 'Chrome / Edge', href: 'https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc' },
  { label: 'Firefox', href: 'https://addons.mozilla.org/en-US/firefox/addon/get-cookies-txt-locally/' },
]
export const EXTENSION_REPO = 'https://github.com/kairi003/Get-cookies.txt-LOCALLY'

/** Bundled copies served from `apps/web/public/extensions`, for networks that can't reach the stores */
export const OFFLINE_VERSION = '0.7.2'
const OFFLINE_DIR = `${BASE_PATH}extensions/`

export const OFFLINE_PACKAGES = {
  chrome: { file: `get-cookies-txt-locally-${OFFLINE_VERSION}-chrome.zip`, size: 249022 },
  firefox: { file: `get-cookies-txt-locally-${OFFLINE_VERSION}-firefox.xpi`, size: 258906 },
}
export const OFFLINE_LICENSE = `${OFFLINE_DIR}LICENSE-get-cookies-txt-locally.txt`

export function offlineUrl(file: string) {
  return `${OFFLINE_DIR}${file}`
}
