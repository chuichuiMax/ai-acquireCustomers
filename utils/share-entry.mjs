export const LAST_SHARE_ID_KEY = 'last_owner_share'
export const LAST_SHARE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000
export const ENTRY_ROUTE = 'pages/index/index'
export const SHARED_CASE_ROUTE = 'pages/materials/shared-case'
export const SHARE_SCENES = new Set([1007, 1008, 1044])
export const NORMAL_ENTRY_SCENES = new Set([1001, 1089])
export const CASE_ROUTES = new Set(['pages/materials/materials', SHARED_CASE_ROUTE])

export function normalizeLaunchPath(path = '') {
  return String(path || '').split('?')[0].replace(/^\//, '')
}

// App 的 scene 是数字场景值；二维码参数在 query.scene，Page.onLoad 则直接收到 scene。
export function caseEntryOptions(options = {}) {
  const values = typeof options.query === 'string' ? {} : { ...(options.query || options) }
  // 开发预览的 debug_launch_info.query 是查询字符串，普通扫码则是对象。
  const query = [typeof options.query === 'string' ? options.query : '', String(options.path || '').split('?')[1] || ''].filter(Boolean).join('&')
  for (const pair of query.split('&')) {
    const [key, value] = pair.split('=')
    if (key && !values[key]) values[key] = value || ''
  }
  const raw = values.entryCode || (typeof values.scene === 'string' ? values.scene : '')
  let entryCode = String(raw || '')
  try { entryCode = decodeURIComponent(entryCode) } catch (error) { /* 显示无效入口，不能转入员工登录。 */ }
  return { entryCode, booking: values.booking === '1' || Boolean(entryCode) }
}

export function isNeutralEmployeeLaunch(scene, route, path = '') {
  if (!NORMAL_ENTRY_SCENES.has(Number(scene))) return false
  const pathBase = normalizeLaunchPath(path)
  return !route || route === ENTRY_ROUTE || pathBase === ENTRY_ROUTE || pathBase === ''
}

export function shouldHonorLaunchShareId({ scene, route, path, shareId, normalCaseEntry }) {
  if (!shareId || normalCaseEntry) return false
  if (SHARE_SCENES.has(Number(scene))) return true
  if (isNeutralEmployeeLaunch(scene, route, path)) return false
  const pathBase = normalizeLaunchPath(path)
  return pathBase === SHARED_CASE_ROUTE || CASE_ROUTES.has(route)
}

export function shouldRestoreLastShare({ scene, route, path, lastShareId }) {
  if (!lastShareId) return false
  if (isNeutralEmployeeLaunch(scene, route, path)) return false
  const pathBase = normalizeLaunchPath(path)
  return CASE_ROUTES.has(route) || CASE_ROUTES.has(pathBase)
}

let caseSystemAction = null

export function openCaseSystemPage(method, options, owner) {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1]
  const actionOwner = owner || page?.$vm || page
  // 同一次预览尚未返回时，双击不能覆盖原来的返回标记。
  if (method === 'previewImage' && caseSystemAction?.method === method &&
      caseSystemAction.owner === actionOwner && !caseSystemAction.returned) return false
  const action = { method, page, route: page?.route || '', owner: actionOwner, hidden: false, returned: false }
  caseSystemAction = action
  uni[method]({
    ...options,
    complete(result) {
      // 成功回调只表示调用成功，可能早于 onHide，不能当作预览关闭。
      if (caseSystemAction === action && !action.hidden && /:fail/.test(result.errMsg || '')) caseSystemAction = null
      if (options.complete) options.complete(result)
    }
  })
  return true
}

export function markCaseSystemHide() {
  // 已恢复页面后的下一次离开才是新的入口周期。
  if (caseSystemAction?.returned) caseSystemAction = null
  else if (caseSystemAction) caseSystemAction.hidden = true
}

export function markCaseSystemReturn(owner) {
  if (caseSystemAction?.owner === owner) caseSystemAction.returned = true
}

export function isCaseSystemReturn(route) {
  const action = caseSystemAction
  if (!action) return false
  const pages = getCurrentPages()
  const page = pages[pages.length - 1]
  if (action.route !== route || (action.page !== page && page?.$vm !== action.owner)) {
    caseSystemAction = null
    return false
  }
  // Page/App.onShow 顺序不固定，重复恢复回调也属于同一次返回。
  action.returned = true
  return true
}

export function clearCaseSystemAction(owner) {
  if (caseSystemAction?.owner === owner) caseSystemAction = null
}

export function buildSharedCasePath(shareId) {
  if (!shareId) return ''
  return `/pages/materials/shared-case?shareId=${encodeURIComponent(shareId)}`
}

export function saveLastShareId(shareId, now = Date.now()) {
  if (!shareId) return false
  try {
    uni.setStorageSync(LAST_SHARE_ID_KEY, { shareId: String(shareId), savedAt: now })
    return true
  } catch (error) {
    return false
  }
}

export function getLastShareId(now = Date.now()) {
  try {
    const value = uni.getStorageSync(LAST_SHARE_ID_KEY)
    const shareId = typeof value === 'string' ? value : value && value.shareId
    const savedAt = typeof value === 'string' ? 0 : Number(value && value.savedAt)
    if (!shareId) return ''
    if (savedAt && now - savedAt > LAST_SHARE_MAX_AGE_MS) {
      uni.removeStorageSync(LAST_SHARE_ID_KEY)
      return ''
    }
    return String(shareId)
  } catch (error) {
    return ''
  }
}


// 原生组件没有 uni API 的 complete 回调，单独标记头像/手机号等系统交互。
export function beginCaseComponentAction(method, owner) {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1]
  const action = { method, page, route: page?.route || '', owner, hidden: false, returned: false }
  caseSystemAction = action
  // 部分取消动作不会触发 onHide/onShow，也不会回调；及时移除未离开页面的标记。
  setTimeout(() => {
    if (caseSystemAction === action && !action.hidden && !action.returned) caseSystemAction = null
  }, 1000)
}

export function finishCaseComponentAction(owner, failed = false) {
  if (caseSystemAction?.owner === owner && failed && !caseSystemAction.hidden) caseSystemAction = null
}
