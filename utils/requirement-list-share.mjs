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

export function isRequirementListGuestLaunch(options = {}) {
  const pathBase = String(options.path || '').split('?')[0].replace(/^\//, '')
  const query = parseRequirementGuestQuery(options)
  if (pathBase === REQUIREMENT_FILL_ROUTE && query.share && query.staff) return true
  return query.share && query.staff
}

export function buildRequirementListSharePath({ typeId = 'rough', staffCode = '' } = {}) {
  const type = encodeURIComponent(String(typeId || 'rough').trim() || 'rough')
  const staff = encodeURIComponent(String(staffCode || '').trim())
  if (!staff) return `/${REQUIREMENT_FILL_ROUTE}`
  return `/${REQUIREMENT_FILL_ROUTE}?share=1&type=${type}&staff=${staff}`
}

export function buildRequirementListGuestPath(options = {}) {
  const query = parseRequirementGuestQuery(options)
  if (!query.staff) return ''
  const type = encodeURIComponent(query.type || 'rough')
  const staff = encodeURIComponent(query.staff)
  return `/${REQUIREMENT_FILL_ROUTE}?share=1&type=${type}&staff=${staff}`
}

export function isRequirementGuestPageOptions(pageOptions = {}) {
  const share = pageOptions.share === '1' || pageOptions.share === 'true'
  const staff = String(pageOptions.staff || pageOptions.usercode || '').trim()
  return share && !!staff
}
