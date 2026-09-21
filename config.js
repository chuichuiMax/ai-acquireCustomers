const LOCAL_BASE_URL = 'http://127.0.0.1:5050'
const ONLINE_BASE_URL = 'https://ai.hi-run.net'

function currentPlatform() {
  try {
    return uni.getSystemInfoSync().platform || ''
  } catch (error) {
    return ''
  }
}

const platform = currentPlatform()
export const BASE_URL = platform && platform !== 'devtools' ? ONLINE_BASE_URL : LOCAL_BASE_URL
export const TOKEN_KEY = 'mp_token'
export const SESSION_KEY = 'mp_session'
