import { resolveApiBaseUrl } from './utils/api-base-url.mjs'

const LOCAL_BASE_URL = 'http://127.0.0.1:5050'
const TEST_BASE_URL = 'http://124.232.148.28:8080'
const TEST_DEVICE_BASE_URL = 'https://ai.hi-run.net'
const ONLINE_BASE_URL = 'https://ai.hi-run.net'
// 小程序统一连接生产 API（开发者工具与真机一致）。
const isDevelopment = false
const useTestServer = false

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
  onlineBaseUrl: ONLINE_BASE_URL,
  useTestServer,
  testBaseUrl: TEST_BASE_URL,
  testDeviceBaseUrl: TEST_DEVICE_BASE_URL
})
export const TOKEN_KEY = 'mp_token'
export const SESSION_KEY = 'mp_session'
