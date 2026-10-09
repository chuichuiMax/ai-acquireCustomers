export const LAST_SHARE_ID_KEY = 'last_owner_share'
export const LAST_SHARE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

let caseSystemAction = null

export function openCaseSystemPage(method, options) {
  const action = { hidden: false }
  caseSystemAction = action
  uni[method]({
    ...options,
    complete(result) {
      // 没有切到后台的取消/失败操作，不应影响下一次普通入口。
      if (caseSystemAction === action && !action.hidden) caseSystemAction = null
      if (options.complete) options.complete(result)
    }
  })
}

export function markCaseSystemHide() {
  if (caseSystemAction) caseSystemAction.hidden = true
}

export function consumeCaseSystemReturn() {
  const action = caseSystemAction
  caseSystemAction = null
  return Boolean(action && action.hidden)
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
