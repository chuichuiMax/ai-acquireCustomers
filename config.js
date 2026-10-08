import { resolveApiBaseUrl } from './utils/api-base-url.mjs'

const LOCAL_BASE_URL = 'http://127.0.0.1:5050'
const TEST_BASE_URL = 'http://124.232.148.28:8080'
const ONLINE_BASE_URL = 'https://ai.hi-run.net'
// 连测试服时 useTestServer=true；线上 https://ai.hi-run.net 时 useTestServer=false。
const isDevelopment = false
const useTestServer = true

function currentPlatform() {
  // #ifdef MP-WEIXIN
  try { return uni.getSystemInfoSync().platform || '' } catch (error) { return '' }
  // #endif
  return ''
}

export const BASE_URL = resolveApiBaseUrl({
  isDevelopment,
  platform: currentPlatform(),
  localBaseUrl: useTestServer ? TEST_BASE_URL : LOCAL_BASE_URL,
  onlineBaseUrl: useTestServer ? TEST_BASE_URL : ONLINE_BASE_URL
})
export const TOKEN_KEY = 'mp_token'
export const SESSION_KEY = 'mp_session'
