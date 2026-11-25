import { employeeFromMe } from './internal-access-policy.mjs'

export const EMPLOYEE_CODE_KEY = 'mp_employee_code'

export function persistEmployeeCode(code) {
  const normalized = String(code || '').trim()
  if (!normalized) return
  try {
    uni.setStorageSync(EMPLOYEE_CODE_KEY, normalized)
  } catch (error) {}
}

export function clearPersistedEmployeeCode() {
  try {
    uni.removeStorageSync(EMPLOYEE_CODE_KEY)
  } catch (error) {}
}

export function readPersistedEmployeeCode() {
  try {
    return String(uni.getStorageSync(EMPLOYEE_CODE_KEY) || '').trim()
  } catch (error) {
    return ''
  }
}

export function isAuthoritativeEmployeeWorkCode(code, profile) {
  const text = String(code || '').trim()
  if (!text) return false
  if (profile && profile.source === 'user') return false
  const id = String((profile && profile.id) || '').trim()
  if (id.startsWith('user:')) return false
  if (/^mp_[0-9a-f-]+$/i.test(text)) return false
  return true
}

export function extractEmployeeWorkCode(employee = {}) {
  if (!employee || typeof employee !== 'object') return ''
  const raw = String(
    employee.employee_code || employee.employeeCode || employee.work_no || employee.workNo || ''
  ).trim()
  return isAuthoritativeEmployeeWorkCode(raw, employee) ? raw : ''
}

export function resolveRequirementListUserCode(employee = {}) {
  return extractEmployeeWorkCode(employee) || readPersistedEmployeeCode()
}

/** 登录成功后从 /me 拉取并缓存工号（手机号快捷登录兜底）。 */
export async function refreshEmployeeWorkCodeFromMe(getMe) {
  try {
    const data = await getMe()
    const code = resolveRequirementListUserCode(employeeFromMe(data) || {})
    if (code) {
      persistEmployeeCode(code)
      return code
    }
  } catch (error) {
    /* 由调用方决定是否提示 */
  }
  return readPersistedEmployeeCode()
}

/** 合并登录 / 员工查询多处返回字段，优先保留工号。 */
export function mergeEmployeeProfile(primary, secondary) {
  const a = primary && typeof primary === 'object' ? primary : {}
  const b = secondary && typeof secondary === 'object' ? secondary : {}
  const code = extractEmployeeWorkCode(a) || extractEmployeeWorkCode(b)
  return {
    ...b,
    ...a,
    ...(code ? { employee_code: code } : {}),
    name: String(a.name || b.name || '').trim(),
    login_account: String(a.login_account || b.login_account || '').trim(),
    role: String(a.role || b.role || '').trim()
  }
}
