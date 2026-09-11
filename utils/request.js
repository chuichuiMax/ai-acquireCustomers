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

const LOCAL_FILE_RE = /^(wxfile:|file:|blob:|http:\/\/tmp\/|https:\/\/tmp\/)/i
const ALREADY_OPTIMIZED_RE = /(?:x-oss-process|imageMogr2|imageView2|format=webp|\/format,webp)/i

function appendQuery(url, extra) {
  if (!url || !extra) return url
  return `${url}${url.includes('?') ? '&' : '?'}${extra}`
}

function applyImageOptimize(url, { format = '', width = 0, quality = 0 } = {}) {
  if (!url || ALREADY_OPTIMIZED_RE.test(url)) return url
  const w = width ? Math.round(width) : 0
  const q = quality ? Math.round(quality) : 0

  if (/aliyuncs\.com|oss-cn-|oss-accelerate/i.test(url)) {
    const parts = []
    if (format === 'webp') parts.push('format,webp')
    if (w) parts.push(`resize,w_${w}`)
    if (q) parts.push(`quality,q_${q}`)
    return parts.length ? appendQuery(url, `x-oss-process=image/${parts.join('/')}`) : url
  }

  if (/myqcloud\.com|\.cos\./i.test(url)) {
    const parts = ['imageMogr2']
    if (w) parts.push(`thumbnail/${w}x`)
    if (format === 'webp') parts.push('format/webp')
    if (q) parts.push(`quality/${q}`)
    return appendQuery(url, parts.join('/'))
  }

  if (/qiniucdn|clouddn\.com|qnssl\.com/i.test(url)) {
    const parts = ['imageView2/2']
    if (w) parts.push(`w/${w}`)
    if (format === 'webp') parts.push('format/webp')
    if (q) parts.push(`q/${q}`)
    return appendQuery(url, parts.join('/'))
  }

  const params = []
  if (format) params.push(`format=${encodeURIComponent(format)}`)
  if (w) params.push(`w=${w}`)
  if (q) params.push(`q=${q}`)
  return appendQuery(url, params.join('&'))
}

export function mediaUrl(path, options = {}) {
  if (!path) return ''
  if (LOCAL_FILE_RE.test(path)) return path

  let url = path
  if (!/^https?:\/\//.test(url)) {
    url = `${BASE_URL}${url}`
    const token = getToken()
    if (token) url = appendQuery(url, `access_token=${encodeURIComponent(token)}`)
  }

  if (options.format || options.width || options.quality) {
    url = applyImageOptimize(url, options)
  }
  return url
}

export function thumbUrl(path, width = 480) {
  return mediaUrl(path, { format: 'webp', width, quality: 72 })
}

export function galleryThumbUrl(item, width = 480) {
  if (!item) return ''
  const path =
    item.thumbnail_file_url ||
    item.thumb_url ||
    item.thumbnail_url ||
    item.webp_url ||
    item.preview_url ||
    item.file_url ||
    item.url ||
    item.path ||
    ''
  return thumbUrl(path, width)
}

// Share assets are intentionally public: WeChat fetches card covers outside the user's session.
export function publicMediaUrl(path) {
  if (!path) return ''
  if (/^https?:\/\//.test(path)) return path
  return `${BASE_URL}${path}`
}

export function errorMessage(res) {
  const detail = res && res.data && res.data.detail
  if (typeof detail === 'string') return detail
  if (detail && detail.error && detail.error.message) return detail.error.message
  return (res && res.data && res.data.message) || '请求失败'
}

export function request({ url, method = 'GET', data, header = {}, requiresAuth = true }) {
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${BASE_URL}${url}`,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        ...(requiresAuth && getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        ...header
      },
      success: (res) => {
        if (requiresAuth && res.statusCode === 401) {
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
