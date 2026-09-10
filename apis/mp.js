import { request, uploadFile } from '../utils/request'

export const mpAuthApi = {
  sendSms: (data) => request({ url: '/api/mp/auth/sms/send', method: 'POST', data }),
  loginBySms: (data) => request({ url: '/api/mp/auth/sms/login', method: 'POST', data }),
  loginByWechat: (data) => request({ url: '/api/mp/auth/wechat/code', method: 'POST', data }),
  bindWechatPhone: (data) => request({ url: '/api/mp/auth/wechat/phone', method: 'POST', data }),
  confirmLogin: (data) => request({ url: '/api/mp/auth/confirm', method: 'POST', data }),
  cancelLogin: (data) => request({ url: '/api/mp/auth/cancel', method: 'POST', data }),
  logout: () => request({ url: '/api/mp/auth/logout', method: 'POST' })
}

export const mpMeApi = {
  get: () => request({ url: '/api/mp/me' }),
  update: (data) => request({ url: '/api/mp/me', method: 'PATCH', data })
}

export const mpContentApi = {
  formSchema: (serviceEntry) =>
    request({ url: `/api/mp/content/form-schema?service_entry=${encodeURIComponent(serviceEntry)}` }),
  pricing: (frameArea) =>
    request({ url: `/api/mp/content/pricing?frame_area=${encodeURIComponent(frameArea)}` }),
  coverTemplates: () => request({ url: '/api/mp/content/cover-templates' }),
  uploadCover: (filePath, category = 'uncategorized') =>
    uploadFile({
      url: '/api/mp/content/uploads/cover',
      filePath,
      formData: { category: category || 'uncategorized' }
    }),
  galleries: () => request({ url: '/api/mp/content/galleries' }),
  galleryItems: (category) =>
    request({ url: `/api/mp/content/gallery-items?category=${encodeURIComponent(category)}` }),
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
