function currentRoute() {
  try {
    const pages = getCurrentPages()
    return pages.length ? pages[pages.length - 1].route : ''
  } catch (error) {
    return ''
  }
}

function routeFromLaunchUrl(url) {
  return String(url || '').split('?')[0].replace(/^\//, '')
}

let pendingNavigation = null
let lastTargetRoute = ''
let lastNavigationAt = 0

const DEDUPE_MS = 1500

function runLaunch(method, url) {
  return new Promise((resolve) => {
    method({
      url,
      success: () => resolve(true),
      fail: () => resolve(false)
    })
  })
}

/**
 * 合并重复的 reLaunch，冷启动从 index 优先 redirectTo，避免 reLaunch:fail timeout。
 */
export function safeReLaunch(url) {
  if (!url) return Promise.resolve(true)

  const targetRoute = routeFromLaunchUrl(url)
  const current = currentRoute()
  if (current === targetRoute) return Promise.resolve(true)

  const now = Date.now()
  if (pendingNavigation && lastTargetRoute === targetRoute && now - lastNavigationAt < DEDUPE_MS) {
    return pendingNavigation
  }

  lastTargetRoute = targetRoute
  lastNavigationAt = now

  const fromEntry = current === 'pages/index/index' || !current
  const preferRedirect = fromEntry && targetRoute !== 'pages/index/index'

  pendingNavigation = (preferRedirect ? runLaunch(uni.redirectTo, url) : runLaunch(uni.reLaunch, url))
    .then((ok) => {
      if (ok) return true
      return preferRedirect ? runLaunch(uni.reLaunch, url) : runLaunch(uni.redirectTo, url)
    })
    .catch(() => false)
    .finally(() => {
      pendingNavigation = null
    })

  return pendingNavigation
}

export function resetSafeNavigation() {
  pendingNavigation = null
  lastTargetRoute = ''
  lastNavigationAt = 0
}
