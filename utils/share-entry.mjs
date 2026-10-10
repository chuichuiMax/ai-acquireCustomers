export const LAST_SHARE_ID_KEY = 'last_owner_share'
export const LAST_SHARE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

let caseSystemAction = null

export function openCaseSystemPage(method, options, owner) {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1]
  // 同一次预览尚未返回时，双击不能覆盖原来的返回标记。
  if (method === 'previewImage' && caseSystemAction?.method === method && caseSystemAction.page === page) return false
  const action = { method, page, route: page?.route || '', owner: owner || page, hidden: false }
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
  if (caseSystemAction) caseSystemAction.hidden = true
}

export function consumeCaseSystemReturn(route) {
  const action = caseSystemAction
  caseSystemAction = null
  const pages = getCurrentPages()
  // 返回可能没有先触发 App.onHide；仅保护发起操作的原页面一次。
  return Boolean(action && action.route === route && action.page === pages[pages.length - 1])
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
