import { BASE_URL, TOKEN_KEY } from '../config'
import { safeReLaunch } from './safe-navigation'

export function getToken() {
  return uni.getStorageSync(TOKEN_KEY) || ''
}

export function authMediaHeaders() {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/** 小程序 Canvas 需本地路径；鉴权图同时带 query token 与 Authorization。 */
export function downloadMediaToTempFile(url) {
  return new Promise((resolve, reject) => {
    if (!url) {
      reject(new Error('missing url'))
      return
    }
    uni.downloadFile({
      url,
      header: authMediaHeaders(),
      success: (res) => {
        if (res.statusCode === 200 && res.tempFilePath) resolve(res.tempFilePath)
        else reject(new Error(`download failed: ${res.statusCode || 'unknown'}`))
      },
      fail: reject
    })
  })
}

export function saveImageUrlToPhotosAlbum(url) {
  return new Promise((resolve, reject) => {
    if (!url) {
      reject(new Error('missing url'))
      return
    }
    uni.showLoading({ title: '正在下载', mask: true })
    downloadMediaToTempFile(url)
      .then(
        (filePath) =>
          new Promise((resolveSave, rejectSave) => {
            uni.saveImageToPhotosAlbum({
              filePath,
              success: resolveSave,
              fail: rejectSave
            })
          })
      )
      .then(() => {
        uni.hideLoading()
        uni.showToast({ title: '已保存到相册', icon: 'none' })
        resolve()
      })
      .catch((error) => {
        uni.hideLoading()
        const errMsg = String((error && (error.errMsg || error.message)) || '')
        if (/auth deny|authorize|permission|拒绝|权限/i.test(errMsg)) {
          uni.showModal({
            title: '需要相册权限',
            content: '请允许保存图片到相册后重试。',
            confirmText: '去设置',
            success: ({ confirm }) => {
              if (confirm && typeof uni.openSetting === 'function') uni.openSetting({})
            }
          })
          reject(error)
          return
        }
        uni.showToast({ title: '图片下载失败', icon: 'none' })
        reject(error)
      })
  })
}

export function setToken(token) {
  const previous = getToken()
  if (token) {
    uni.setStorageSync(TOKEN_KEY, token)
  } else {
    uni.removeStorageSync(TOKEN_KEY)
  }
  if (previous !== (token || '')) uni.$emit('auth-token-changed')
}

const LOCAL_FILE_RE = /^(wxfile:|file:|blob:|http:\/\/tmp\/|https:\/\/tmp\/)/i
const ALREADY_OPTIMIZED_RE = /(?:x-oss-process|imageMogr2|imageView2|format=webp|\/format,webp)/i

function appendQuery(url, extra) {
  if (!url || !extra) return url
  return `${url}${url.includes('?') ? '&' : '?'}${extra}`
}

function applyImageOptimize(url, { format = '', width = 0, quality = 0 } = {}) {
  if (!url || ALREADY_OPTIMIZED_RE.test(url)) return url
  // 后端代理的 /api/.../file、thumbnail、overlay 不支持 CDN 变换参数；带上 format=webp 只会干扰本地/鉴权下载。
  if (/\/api\//i.test(url)) return url
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

  return url
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

function validationDetailMessage(detail) {
  if (!Array.isArray(detail) || !detail.length) return ''
  const parts = detail
    .map((item) => {
      if (!item || typeof item !== 'object') return ''
      const msg = String(item.msg || item.message || '').trim()
      if (!msg) return ''
      const loc = Array.isArray(item.loc) ? item.loc.filter((part) => typeof part === 'string' && part !== 'body') : []
      return loc.length ? `${loc.join('.')}：${msg}` : msg
    })
    .filter(Boolean)
  return parts.length ? parts.join('；') : ''
}

export function errorMessage(res) {
  const detail = res && res.data && res.data.detail
  if (typeof detail === 'string') return detail
  const validationMessage = validationDetailMessage(detail)
  if (validationMessage) return validationMessage
  if (detail && detail.error && detail.error.message) {
    const fields = detail.error.fields || detail.fields
    if (Array.isArray(fields) && fields.length) {
      const labels = fields
        .map((item) => (item && (item.label || item.field)) || '')
        .map((item) => String(item || '').trim())
        .filter(Boolean)
      if (labels.length) return `${detail.error.message}：${labels.join('、')}`
    }
    return detail.error.message
  }
  if (res && res.data && res.data.message) return res.data.message
  const errMsg = String((res && (res.errMsg || res.message)) || '')
  if (/timeout/i.test(errMsg)) return '请求超时，请稍后重试'
  if (/url not in domain|domain list|合法域名|not in domain/i.test(errMsg)) {
    const api = /uploadFile/i.test(errMsg) ? 'uploadFile' : /downloadFile/i.test(errMsg) ? 'downloadFile' : 'request'
    return `域名未配置：请在公众平台配置 ${api} 合法域名；临时预览请在手机开启调试后重试`
  }
  if (/fail/i.test(errMsg) && errMsg) return '网络请求失败，请检查网络后重试'
  const statusCode = res && res.statusCode
  if (statusCode) return statusCode === 0 ? '网络请求失败，请检查网络或服务器域名配置' : `请求失败（${statusCode}）`
  return '请求失败'
}

export function request({
  url,
  method = 'GET',
  data,
  header = {},
  requiresAuth = true,
  timeout = 60000,
  // 启动身份探测会依次试多个 /me；401 时不要边查边 reLaunch，避免卡在入口页。
  silentAuth = false
}) {
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${BASE_URL}${url}`,
      method,
      data,
      timeout,
      header: {
        'Content-Type': 'application/json',
        ...(requiresAuth && getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        ...header
      },
      success: (res) => {
        if (requiresAuth && res.statusCode === 401) {
          setToken('')
          if (!silentAuth) {
            const pages = getCurrentPages()
            const route = pages.length ? pages[pages.length - 1].route : ''
            if (route !== 'pages/login/login') {
              safeReLaunch('/pages/login/login')
            }
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

export function uploadFile({ url, filePath, name = 'file', formData = {}, timeout = 120000, requiresAuth = true }) {
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: `${BASE_URL}${url}`,
      filePath,
      name,
      formData,
      timeout,
      header: requiresAuth && getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
      success: (res) => {
        if (requiresAuth && res.statusCode === 401) {
          setToken('')
          const pages = getCurrentPages()
          const route = pages.length ? pages[pages.length - 1].route : ''
          if (route !== 'pages/login/login') {
            safeReLaunch('/pages/login/login')
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
      fail: (error) => reject({ ...(error || {}), statusCode: 0, errMsg: (error && error.errMsg) || 'uploadFile:fail' })
    })
  })
}
