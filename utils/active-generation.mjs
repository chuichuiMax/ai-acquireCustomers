export const ACTIVE_GENERATION_KEY = 'mp_active_generation'
export const WORKSPACE_HOME_PATH = '/pages/generate/generate'

export const WORKSPACE_STAY_ROUTES = new Set([
  'pages/generate/generate',
  'pages/generate/locked',
  'pages/generate/result',
  'pages/manage/manage',
  'pages/materials/materials',
  'pages/cover/cover',
  'pages/mine/mine',
  'pages/mine/works',
  'pages/mine/uploads',
  'pages/home/home'
])

export function saveActiveGeneration(taskId, serviceEntry) {
  if (!taskId) return false
  try {
    uni.setStorageSync(ACTIVE_GENERATION_KEY, {
      taskId: String(taskId),
      serviceEntry: serviceEntry ? String(serviceEntry) : '',
      savedAt: Date.now()
    })
    return true
  } catch (error) {
    return false
  }
}

export function getActiveGeneration() {
  try {
    const value = uni.getStorageSync(ACTIVE_GENERATION_KEY)
    const taskId = value && value.taskId
    if (!taskId) return null
    return {
      taskId: String(taskId),
      serviceEntry: value.serviceEntry ? String(value.serviceEntry) : ''
    }
  } catch (error) {
    return null
  }
}

export function clearActiveGeneration() {
  try {
    uni.removeStorageSync(ACTIVE_GENERATION_KEY)
  } catch (error) {
    /* 本地缓存清理失败不影响页面离开 */
  }
}

export function buildLockedPath(session) {
  if (!session || !session.taskId) return ''
  return `/pages/generate/locked?task_id=${encodeURIComponent(session.taskId)}&service_entry=${encodeURIComponent(
    session.serviceEntry || ''
  )}`
}

export function resolveAllowedShowUrl(route, session) {
  if (WORKSPACE_STAY_ROUTES.has(route)) return ''
  if (session && session.taskId) return buildLockedPath(session)
  return WORKSPACE_HOME_PATH
}
