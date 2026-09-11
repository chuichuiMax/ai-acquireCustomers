const LOCAL_BASE_URL = 'http://127.0.0.1:5050'
const ONLINE_BASE_URL = 'https://ai.hi-run.net'

const isDevelopment = process.env.NODE_ENV === 'development'

export const BASE_URL = isDevelopment ? LOCAL_BASE_URL : ONLINE_BASE_URL
export const TOKEN_KEY = 'mp_token'
export const SESSION_KEY = 'mp_session'
