import { BASE_URL, TOKEN_KEY } from '../config'

export function getToken() {
  return uni.getStorageSync(TOKEN_KEY) || ''
}

export function setToken(token) {
  if (token) {
    uni.setStorageSync(TOKEN_KEY, token)
  } else {
    uni.removeStorageSync(TOKEN_KEY)
  }
}

export function mediaUrl(path) {
  if (!path) return ''
  if (/^https?:\/\//.test(path)) return path
  const token = getToken()
  const joiner = path.includes('?') ? '&' : '?'
  return `${BASE_URL}${path}${token ? `${joiner}access_token=${encodeURIComponent(token)}` : ''}`
}

export function errorMessage(res) {
  const detail = res && res.data && res.data.detail
  if (typeof detail === 'string') return detail
  if (detail && detail.error && detail.error.message) return detail.error.message
  return (res && res.data && res.data.message) || '请求失败'
}

export function request({ url, method = 'GET', data, header = {} }) {
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${BASE_URL}${url}`,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        ...header
      },
      success: (res) => {
        if (res.statusCode === 401) {
          setToken('')
          const pages = getCurrentPages()
          const route = pages.length ? pages[pages.length - 1].route : ''
          if (route !== 'pages/login/login') {
            uni.reLaunch({ url: '/pages/login/login' })
          }
          reject(res)
          return
        }
        if (res.statusCode >= 400) {
          reject(res)
          return
        }
        resolve(res.data)
      },
      fail: reject
    })
  })
}

export function uploadFile({ url, filePath, name = 'file', formData = {} }) {
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: `${BASE_URL}${url}`,
      filePath,
      name,
      formData,
      header: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
      success: (res) => {
        if (res.statusCode === 401) {
          setToken('')
          const pages = getCurrentPages()
          const route = pages.length ? pages[pages.length - 1].route : ''
          if (route !== 'pages/login/login') {
            uni.reLaunch({ url: '/pages/login/login' })
          }
          reject(res)
          return
        }
        if (res.statusCode >= 400) {
          try {
            reject({ statusCode: res.statusCode, data: JSON.parse(res.data) })
          } catch (error) {
            reject(res)
          }
          return
        }
        try {
          resolve(typeof res.data === 'string' ? JSON.parse(res.data) : res.data)
        } catch (error) {
          reject(res)
        }
      },
      fail: reject
    })
  })
}
