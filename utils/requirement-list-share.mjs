export const REQUIREMENT_FILL_ROUTE = 'pages/mine/requirement-list-fill'

function launchQueryString(options = {}) {
  const chunks = []
  if (typeof options.query === 'string' && options.query.trim()) chunks.push(options.query.trim())
  const pathTail = String(options.path || '').split('?')[1]
  if (pathTail) chunks.push(pathTail)
  return chunks.join('&')
}

export function parseRequirementGuestQuery(options = {}) {
  const values = typeof options.query === 'string' ? {} : { ...(options.query || options) }
  for (const pair of launchQueryString(options).split('&')) {
    if (!pair) continue
    const [key, raw] = pair.split('=')
    if (!key || values[key] != null) continue
    try {
      values[key] = decodeURIComponent(raw || '')
    } catch {
      values[key] = raw || ''
    }
  }
  const share = values.share === '1' || values.share === 'true'
  const staff = String(values.staff || values.usercode || '').trim()
  const type = String(values.type || 'rough').trim() || 'rough'
  return { share, staff, type }
}

export function currentRequirementFillPageOptions() {
  try {
    if (typeof getCurrentPages !== 'function') return null
    const pages = getCurrentPages()
    const page = pages[pages.length - 1]
    if (!page || page.route !== REQUIREMENT_FILL_ROUTE) return null
    return page.options || {}
  } catch {
    return null
  }
}

/** 分享冷启动时 App 参数可能缺 query，从当前填写页选项补全。 */
export function mergeRequirementLaunchOptions(appOptions = {}) {
  const pageOptions = currentRequirementFillPageOptions()
  if (!pageOptions) return appOptions
  const merged = { ...appOptions }
  const pathBase = String(merged.path || '').split('?')[0].replace(/^\//, '')
  if (!pathBase || pathBase === REQUIREMENT_FILL_ROUTE) {
    if (!merged.path) merged.path = REQUIREMENT_FILL_ROUTE
    const query = typeof merged.query === 'object' && merged.query && !Array.isArray(merged.query)
      ? { ...merged.query }
      : {}
    for (const [key, value] of Object.entries(pageOptions)) {
      if (query[key] == null || query[key] === '') query[key] = value
    }
    merged.query = query
  }
  return merged
}

export function isRequirementListGuestLaunch(appOptions = {}) {
  const options = mergeRequirementLaunchOptions(appOptions)
  const pathBase = String(options.path || '').split('?')[0].replace(/^\//, '')
  const query = parseRequirementGuestQuery(options)
  if (query.share && query.staff) return true
  if (pathBase === REQUIREMENT_FILL_ROUTE && query.share) return true
  const route = currentRequirementFillPageOptions()
  if (route && isRequirementGuestPageOptions(route)) return true
  return false
}

export function buildRequirementListSharePath({ typeId = 'rough', staffCode = '' } = {}) {
  const type = encodeURIComponent(String(typeId || 'rough').trim() || 'rough')
  const staff = String(staffCode || '').trim()
  if (!staff) return ''
  return `/${REQUIREMENT_FILL_ROUTE}?share=1&type=${type}&staff=${encodeURIComponent(staff)}`
}

export function buildRequirementListGuestPath(appOptions = {}) {
  const options = mergeRequirementLaunchOptions(appOptions)
  const query = parseRequirementGuestQuery(options)
  if (!query.share) return ''
  const type = encodeURIComponent(query.type || 'rough')
  if (query.staff) {
    return `/${REQUIREMENT_FILL_ROUTE}?share=1&type=${type}&staff=${encodeURIComponent(query.staff)}`
  }
  return `/${REQUIREMENT_FILL_ROUTE}?share=1&type=${type}`
}

export function isRequirementGuestPageOptions(pageOptions = {}) {
  return pageOptions.share === '1' || pageOptions.share === 'true'
}