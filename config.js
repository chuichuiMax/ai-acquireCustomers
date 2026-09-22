import { resolveApiBaseUrl } from './utils/api-base-url.mjs'

const LOCAL_BASE_URL = 'http://127.0.0.1:5050'
const ONLINE_BASE_URL = 'https://ai.hi-run.net'
// The current DevTools session is being used to verify the deployed service.
// Keep the local URL available for future local-Docker work, but route this
// generated mini-program package to the HTTPS API so login uses online data.
const isDevelopment = false

function currentPlatform() {
  // #ifdef MP-WEIXIN
  try { return uni.getSystemInfoSync().platform || '' } catch (error) { return '' }
  // #endif
  return ''
}

export const BASE_URL = resolveApiBaseUrl({
  isDevelopment,
  platform: currentPlatform(),
  localBaseUrl: LOCAL_BASE_URL,
  onlineBaseUrl: ONLINE_BASE_URL
})
export const TOKEN_KEY = 'mp_token'
export const SESSION_KEY = 'mp_session'
