/** 与 PC `web/src/utils/requirementListUrl.js` 结果一致（避免小程序运行时缺少 URL） */
const REQUIREMENT_LIST_FORM = 'http://portal.hi-run.net/edc/formview/z66223'
const REQUIREMENT_LIST_KEY = '37n795'

export function requirementListUrl(userCode, { refresh = false } = {}) {
  const code = String(userCode || '').trim()
  if (!code) return ''
  const parts = [`usercode=${encodeURIComponent(code)}`]
  if (refresh) parts.push(`_wx_t=${Date.now()}`)
  const separator = REQUIREMENT_LIST_FORM.includes('?') ? '&' : '?'
  return `${REQUIREMENT_LIST_FORM}${separator}${parts.join('&')}#/?_key=${REQUIREMENT_LIST_KEY}`
}
