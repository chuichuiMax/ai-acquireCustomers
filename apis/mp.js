import { downloadMediaToTempFile, publicMediaUrl, getToken, request, setToken, uploadFile } from '../utils/request'
import { employeeFromMe } from '../utils/internal-access-policy.mjs'
import {
  isImageDesignAnalysisPendingError,
  sanitizeImageDesignPolishPayload
} from '../utils/image-design-logic.mjs'

function isMissingApi(error) {
  const status = error && error.statusCode
  return status === 404 || status === 405
}

function toCoverGeneratePayload(data) {
  return {
    mode: data.source_asset_id || data.source_item_id ? 'image_to_image' : 'text_to_image',
    source_asset_ids: data.source_asset_id ? [data.source_asset_id] : [],
    image_item_id: data.source_item_id || undefined,
    prompt: data.prompt,
    size: data.size,
    n: data.n,
    parameters: {
      quality: data.quality,
      save_target: data.save_target,
      style: data.style,
      extra_description: data.extra_description || ''
    }
  }
}

async function firstAvailable(fns) {
  let lastError
  for (const fn of fns) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (!isMissingApi(error)) throw error
    }
  }
  throw lastError
}

const IMAGE_DESIGN_POLISH_TIMEOUT_MS = 180000
const IMAGE_DESIGN_POLISH_PENDING_ATTEMPTS = 10
const IMAGE_DESIGN_POLISH_PENDING_DELAY_MS = 2000

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function postImageDesignPolish(data) {
  const payload = sanitizeImageDesignPolishPayload(data)
  let lastError
  for (let attempt = 0; attempt < IMAGE_DESIGN_POLISH_PENDING_ATTEMPTS; attempt += 1) {
    try {
      return await request({
        url: '/api/mp/image-design/polish',
        method: 'POST',
        data: payload,
        timeout: IMAGE_DESIGN_POLISH_TIMEOUT_MS
      })
    } catch (error) {
      lastError = error
      const canRetry =
        isImageDesignAnalysisPendingError(error) && attempt + 1 < IMAGE_DESIGN_POLISH_PENDING_ATTEMPTS
      if (!canRetry) throw error
      await delay(IMAGE_DESIGN_POLISH_PENDING_DELAY_MS)
    }
  }
  throw lastError
}

function shouldFallbackPasswordLogin(error) {
  return isMissingApi(error)
}

function passwordLoginPayload(data) {
  const account = String((data && (data.login_account || data.account || data.username || data.phone)) || '').trim()
  return {
    login_account: account,
    account: account,
    username: account,
    phone: account,
    mobile: account,
    login_port: 'app',
    port: 'app',
    password: data && data.password
  }
}

async function tryPasswordLogin(url, data, extra) {
  try {
    return await request(
      Object.assign(
        {
          url: url,
          method: 'POST',
          data: data,
          requiresAuth: false,
          timeout: 30000
        },
        extra || {}
      )
    )
  } catch (error) {
    if (!shouldFallbackPasswordLogin(error)) throw error
    return null
  }
}

function employeeFieldEquals(value, account) {
  return String(value || '').trim() === account
}

function matchEmployeeAccount(employee, account) {
  if (!employee || !account) return false
  return (
    employeeFieldEquals(employee.login_account, account) ||
    employeeFieldEquals(employee.employee_code, account) ||
    employeeFieldEquals(employee.phone_number, account) ||
    employeeFieldEquals(employee.phone, account) ||
    employeeFieldEquals(employee.uid, account)
  )
}

async function findEmployeeByAccount(account) {
  const keyword = String(account || '').trim()
  if (!keyword) return null
  try {
    const data = await request({
      url: '/api/employees?keyword=' + encodeURIComponent(keyword),
      timeout: 5000,
      silentAuth: true
    })
    const list = (data && data.employees) || []
    for (let index = 0; index < list.length; index += 1) {
      if (matchEmployeeAccount(list[index], keyword)) return list[index]
    }
    if (list.length === 1) return list[0]
    return null
  } catch (error) {
    if (isMissingApi(error) || (error && (error.statusCode === 401 || error.statusCode === 403))) return null
    if (error && error.statusCode === 408) return null
    throw error
  }
}

async function loadEmployeeRecord(data, extraAccount) {
  const current = employeeFromMe(data)
  if (current && Object.prototype.hasOwnProperty.call(current, 'login_port')) return current
  if (data && data.employee && typeof data.employee === 'object' && Object.keys(data.employee).length) {
    return current
  }
  const keywords = []
  const seen = {}
  function addKeyword(value) {
    const keyword = String(value || '').trim()
    if (!keyword || seen[keyword]) return
    seen[keyword] = true
    keywords.push(keyword)
  }
  addKeyword(extraAccount)
  if (current) {
    addKeyword(current.login_account)
    addKeyword(current.employee_code)
  }
  if (data) {
    addKeyword(data.uid)
    addKeyword(data.phone_number)
    addKeyword(data.username)
    addKeyword(data.login_account)
  }
  for (let index = 0; index < keywords.length; index += 1) {
    const employee = await findEmployeeByAccount(keywords[index])
    if (employee) return employee
  }
  return current
}

async function withTemporaryToken(token, fn) {
  const previous = getToken()
  setToken(token)
  try {
    return await fn()
  } finally {
    setToken(previous)
  }
}

async function attachEmployee(result, account) {
  if (!result || !result.access_token) return result
  const employee = await withTemporaryToken(result.access_token, function () {
    return loadEmployeeRecord(result, account)
  })
  return employee ? Object.assign({}, result, { employee: employee }) : result
}

export const mpAuthApi = {
  lookupEmployee: (data) =>
    request({ url: '/api/mp/auth/employee/lookup', method: 'POST', data, requiresAuth: false, timeout: 15000 }),
  loginByEmployeeCode: (data) =>
    request({ url: '/api/mp/auth/employee/login', method: 'POST', data, requiresAuth: false, timeout: 30000 }),
  sendSms: (data) =>
    request({
      url: '/api/mp/auth/sms/send',
      method: 'POST',
      data: data,
      requiresAuth: false,
      timeout: 30000
    }),
  loginBySms: async (data) => {
    const phone = String((data && (data.phone || data.login_account || data.account)) || '').trim()
    const result = await request({
      url: '/api/mp/auth/sms/login',
      method: 'POST',
      data: {
        phone: phone,
        login_account: phone,
        account: phone,
        code: data && data.code
      },
      requiresAuth: false,
      timeout: 30000
    })
    return attachEmployee(result, phone)
  },
  loginByPassword: async (data) => {
    const payload = passwordLoginPayload(data)
    const mpPassword = await tryPasswordLogin('/api/mp/auth/password', payload)
    if (mpPassword) return attachEmployee(mpPassword, payload.login_account)
    const mpLogin = await tryPasswordLogin('/api/mp/auth/login', payload)
    if (mpLogin) return attachEmployee(mpLogin, payload.login_account)
    const token = await request({
      url: '/api/auth/token',
      method: 'POST',
      data: {
        username: payload.login_account,
        password: payload.password
      },
      header: { 'Content-Type': 'application/x-www-form-urlencoded' },
      requiresAuth: false,
      timeout: 30000
    })
    return attachEmployee(token, payload.login_account)
  },
  loginByWechat: (data) =>
    request({ url: '/api/mp/auth/wechat/code', method: 'POST', data, requiresAuth: false, timeout: 90000 }),
  bindWechatPhone: (data) =>
    request({ url: '/api/mp/auth/wechat/phone', method: 'POST', data, requiresAuth: false, timeout: 90000 }),
  confirmLogin: (data) =>
    request({ url: '/api/mp/auth/confirm', method: 'POST', data, requiresAuth: false, timeout: 30000 }),
  cancelLogin: (data) =>
    request({ url: '/api/mp/auth/cancel', method: 'POST', data, requiresAuth: false, timeout: 15000 }),
  logout: () => request({ url: '/api/mp/auth/logout', method: 'POST' })
}

export const mpMeApi = {
  get: ({ silentAuth = false } = {}) => request({ url: '/api/mp/me', timeout: 15000, silentAuth })
}

export const mpContentApi = {
  formSchema: (serviceEntry, { includeHycanvasTemplates = true } = {}) =>
    request({
      url: `/api/mp/content/form-schema?service_entry=${encodeURIComponent(serviceEntry)}${
        includeHycanvasTemplates ? '' : '&include_hycanvas_templates=false'
      }`
    }),
  hycanvasTemplates: () => request({ url: '/api/mp/content/hycanvas-templates' }),
  pricing: (frameArea) =>
    request({ url: `/api/mp/content/pricing?frame_area=${encodeURIComponent(frameArea)}` }),
  coverTemplates: () => request({ url: '/api/mp/content/cover-templates' }),
  uploadCover: (filePath, category = 'uncategorized', folder = 'uploads', scope = 'private') =>
    uploadFile({
      url: '/api/mp/content/uploads/cover',
      filePath,
      formData: { category: category || 'uncategorized', folder: folder || 'uploads', scope }
    }),
  /** 我的素材 / 企业毛坯图库：与 PC material-library/images/import 同一套 import 逻辑 */
  uploadMaterialImage: (filePath, category = 'uncategorized', folder = 'uploads') =>
    mpContentApi.uploadCover(filePath, category, folder),
  enterpriseRoughFolders: () => request({ url: '/api/mp/content/galleries?scope=enterprise&rough_only=true' }),
  myMaterialFolders: () => request({ url: '/api/mp/content/my-materials/folders' }),
  myMaterialItems: (folder, page = 1, pageSize = 30, dateFrom = '', dateTo = '') => {
    const dates = dateFrom && dateTo
      ? `&date_from=${encodeURIComponent(dateFrom)}&date_to=${encodeURIComponent(dateTo)}` : ''
    return request({ url: `/api/mp/content/my-materials/${encodeURIComponent(folder)}?page=${page}&page_size=${pageSize}${dates}` })
  },
  galleries: (scope = '') =>
    request({ url: `/api/mp/content/galleries${scope ? `?scope=${encodeURIComponent(scope)}` : ''}` }),
  galleryItems: (category, scope = '', extra = {}) => {
    const query = [`category=${encodeURIComponent(category)}`]
    if (scope) query.push(`scope=${encodeURIComponent(scope)}`)
    const page = extra.page || 1
    const pageSize = extra.page_size || extra.pageSize || 100
    query.push(`page=${encodeURIComponent(page)}`)
    query.push(`page_size=${encodeURIComponent(pageSize)}`)
    if (extra.include_descendants || extra.includeDescendants) query.push('include_descendants=true')
    if (extra.date_from) query.push(`date_from=${encodeURIComponent(extra.date_from)}`)
    if (extra.date_to) query.push(`date_to=${encodeURIComponent(extra.date_to)}`)
    return request({ url: `/api/mp/content/gallery-items?${query.join('&')}` })
  },
  deleteGalleryItem: (itemId) => request({ url: `/api/mp/content/gallery-items/${encodeURIComponent(itemId)}`, method: 'DELETE' }),
  createShare: (itemIds, requestToken, contact = {}) => request({
    url: '/api/mp/share/cases', method: 'POST',
    data: { item_ids: itemIds, request_token: requestToken, ...contact }, timeout: 15000
  }),
  getShare: (shareId) =>
    request({ url: `/api/material-library/shares/${encodeURIComponent(shareId)}`, requiresAuth: false, timeout: 10000 }),
  compileBrief: (data) => request({ url: '/api/mp/content/compile-brief', method: 'POST', data }),
  viralAssets: ({ content_type_code, ready_only = true } = {}) => {
    const query = []
    if (content_type_code) query.push(`content_type_code=${encodeURIComponent(content_type_code)}`)
    if (ready_only) query.push('ready_only=true')
    return request({ url: `/api/mp/content/viral-assets${query.length ? `?${query.join('&')}` : ''}` })
  },
  getTask: (taskId) => request({ url: `/api/mp/content/tasks/${taskId}` }),
  startRun: (taskId, data = {}) =>
    request({ url: `/api/mp/content/tasks/${taskId}/runs`, method: 'POST', data }),
  startDirectRun: (taskId, data = {}) =>
    request({ url: `/api/mp/content/tasks/${taskId}/direct-generate`, method: 'POST', data }),
  getRun: (runId) => request({ url: `/api/mp/content/runs/${runId}` }),
  resumeRun: (runId, data) =>
    request({ url: `/api/mp/content/runs/${runId}/resume`, method: 'POST', data }),
  retryRun: (runId, data = {}) =>
    request({ url: `/api/mp/content/runs/${runId}/retry`, method: 'POST', data }),
  getArtifact: (taskId) => request({ url: `/api/mp/content/tasks/${taskId}/artifact` }),
  list: (params = {}) => {
    const query = Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&')
    return request({ url: `/api/mp/contents${query ? `?${query}` : ''}` })
  },
  favorite: (taskId) => request({ url: `/api/mp/contents/${taskId}/favorite`, method: 'POST' }),
  unfavorite: (taskId) => request({ url: `/api/mp/contents/${taskId}/favorite`, method: 'DELETE' }),
  duplicate: (taskId) => request({ url: `/api/mp/contents/${taskId}/duplicate`, method: 'POST' }),
  remove: (taskId) => request({ url: `/api/mp/contents/${taskId}`, method: 'DELETE' })
}

export const mpImageApi = {
  works: (params = {}) => {
    const query = Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&')
    return request({ url: `/api/mp/image/works${query ? `?${query}` : ''}` })
  },
  hideWork: (assetId) => request({ url: `/api/mp/image/works/${encodeURIComponent(assetId)}`, method: 'DELETE' }),
  polish: (data) =>
    firstAvailable([
      () => request({ url: '/api/mp/image/polish', method: 'POST', data, timeout: 120000 }),
      () => request({ url: '/api/mp/design/polish', method: 'POST', data, timeout: 120000 })
    ]),
  generate: (data) =>
    firstAvailable([
      () => request({ url: '/api/mp/image/generate', method: 'POST', data, timeout: 180000 }),
      () => request({ url: '/api/mp/design/generate', method: 'POST', data, timeout: 180000 }),
      () =>
        request({
          url: '/api/mp/content/covers/generate',
          method: 'POST',
          data: toCoverGeneratePayload(data),
          timeout: 180000
        })
    ]),
  jobs: (params = {}) => {
    const query = Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&')
    const suffix = query ? `?${query}` : ''
    return firstAvailable([
      () => request({ url: `/api/mp/image/jobs${suffix}` }),
      () => request({ url: `/api/mp/design/jobs${suffix}` }),
      () => request({ url: `/api/mp/content/covers/jobs${suffix}` })
    ])
  },
  job: (jobId) =>
    firstAvailable([
      () => request({ url: `/api/mp/image/jobs/${jobId}` }),
      () => request({ url: `/api/mp/design/jobs/${jobId}` }),
      () => request({ url: `/api/mp/content/covers/jobs/${jobId}` })
    ]),
  uploads: () =>
    firstAvailable([
      () => request({ url: '/api/mp/image/uploads' }),
      () => request({ url: '/api/mp/design/uploads' })
    ]),
  uploadPhoto: (filePath, category = 'uncategorized') =>
    firstAvailable([
      () =>
        uploadFile({
          url: '/api/mp/image/uploads',
          filePath,
          formData: { category: category || 'uncategorized' }
        }),
      () => mpContentApi.uploadCover(filePath, category, 'uploads')
    ])
}

// Image design is deliberately isolated from the legacy content-image APIs.  Its
// library owns only references selected for image generation and never changes
// the source material-library item.
export const mpImageDesignApi = {
  profiles: () => request({ url: '/api/mp/image-design/profiles' }),
  saveTargets: () => request({ url: '/api/mp/image-design/save-targets' }),
  drafts: () => request({ url: '/api/mp/image-design/drafts' }),
  saveDrafts: (drafts) => request({ url: '/api/mp/image-design/drafts', method: 'PUT', data: { drafts } }),
  library: (params = {}) => {
    const query = Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&')
    return request({ url: `/api/mp/image-design/library${query ? `?${query}` : ''}` })
  },
  addLibraryItem: (data) => request({ url: '/api/mp/image-design/library', method: 'POST', data }),
  removeLibraryItem: (itemId) => request({ url: `/api/mp/image-design/library/${encodeURIComponent(itemId)}`, method: 'DELETE' }),
  uploadInput: (filePath, role) =>
    uploadFile({
      url: '/api/mp/image-design/uploads',
      filePath,
      formData: { role }
    }),
  polish: (data) => postImageDesignPolish(data),
  createTask: (data) => request({ url: '/api/mp/image-design/tasks', method: 'POST', data, timeout: 180000 }),
  task: (taskId) => request({ url: `/api/mp/image-design/tasks/${encodeURIComponent(taskId)}` }),
  retryTask: (taskId) => request({ url: `/api/mp/image-design/tasks/${encodeURIComponent(taskId)}/retry`, method: 'POST' }),
  results: (params = {}) => {
    const query = Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&')
    return request({ url: `/api/mp/image-design/results${query ? `?${query}` : ''}` })
  }
}


export const mpVisitorApi = {
  resolveEntry: (code) => request({ url: `/api/material-library/share-entries/${encodeURIComponent(code)}`, requiresAuth: false }),
  createSession: (data) => request({ url: '/api/mp/visitor-sessions', method: 'POST', data, requiresAuth: false }),
  submitBooking: (shareToken, data) => request({
    url: `/api/mp/share/cases/${encodeURIComponent(shareToken)}/appointments`,
    method: 'POST', data, header: { 'Content-Type': 'application/x-www-form-urlencoded' }, requiresAuth: false
  })
}

export const mpLeadApi = {
  list: (params = {}) => {
    const query = Object.entries(params).filter(([, value]) => value !== '' && value != null)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&')
    return request({ url: `/api/mp/customer-leads?${query}` })
  },
  summary: () => request({ url: '/api/mp/customer-leads/summary' }),
  get: (id) => request({ url: `/api/mp/customer-leads/${encodeURIComponent(id)}` }),
  read: (id, revision) => request({ url: `/api/mp/customer-leads/${encodeURIComponent(id)}/read`, method: 'POST', data: { revision } }),
  follow: (id, revision) => request({ url: `/api/mp/customer-leads/${encodeURIComponent(id)}/follow`, method: 'POST', data: { revision } }),
  avatar: (path) => downloadMediaToTempFile(publicMediaUrl(path))
}
