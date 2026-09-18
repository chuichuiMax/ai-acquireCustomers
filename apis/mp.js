import { request, uploadFile } from '../utils/request'

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

export const mpAuthApi = {
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
  get: () => request({ url: '/api/mp/me' })
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
  uploadCover: (filePath, category = 'uncategorized') =>
    uploadFile({
      url: '/api/mp/content/uploads/cover',
      filePath,
      formData: { category: category || 'uncategorized' }
    }),
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
    return request({ url: `/api/mp/content/gallery-items?${query.join('&')}` })
  },
  deleteGalleryItem: (itemId) => request({ url: `/api/mp/content/gallery-items/${encodeURIComponent(itemId)}`, method: 'DELETE' }),
  createShare: (itemIds) => request({ url: '/api/mp/share/cases', method: 'POST', data: { item_ids: itemIds } }),
  getShare: (shareId) =>
    request({ url: `/api/material-library/shares/${encodeURIComponent(shareId)}`, requiresAuth: false }),
  compileBrief: (data) => request({ url: '/api/mp/content/compile-brief', method: 'POST', data }),
  getTask: (taskId) => request({ url: `/api/mp/content/tasks/${taskId}` }),
  startRun: (taskId, data = {}) =>
    request({ url: `/api/mp/content/tasks/${taskId}/runs`, method: 'POST', data }),
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
      () =>
        uploadFile({
          url: '/api/mp/content/uploads/cover',
          filePath,
          formData: { category: category || 'uncategorized' }
        })
    ])
}

// Image design is deliberately isolated from the legacy content-image APIs.  Its
// library owns only references selected for image generation and never changes
// the source material-library item.
export const mpImageDesignApi = {
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
  uploadInput: (filePath, role) =>
    uploadFile({
      url: '/api/mp/image-design/uploads',
      filePath,
      formData: { role }
    }),
  polish: (data) => request({ url: '/api/mp/image-design/polish', method: 'POST', data, timeout: 120000 }),
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
