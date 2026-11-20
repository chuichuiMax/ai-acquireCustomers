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

export function extractEmployeeWorkCode(employee = {}) {
  if (!employee || typeof employee !== 'object') return ''
  return String(
    employee.employee_code || employee.employeeCode || employee.work_no || employee.workNo || ''
  ).trim()
}

export function resolveRequirementListUserCode(employee = {}) {
  return extractEmployeeWorkCode(employee) || readPersistedEmployeeCode()
}
