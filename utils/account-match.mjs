export function normalizeAccount(value) {
  let text = String(value == null ? '' : value).trim()
  if (!text) return ''
  if (text.indexOf('+86') === 0) text = text.slice(3).trim()
  if (text.indexOf('86') === 0 && text.length >= 13) text = text.slice(2)
  if (/^1\d{10,}$/.test(text) && text.length > 11) text = text.slice(0, 11)
  return text
}

export function accountsMatch(left, right) {
  const a = String(left == null ? '' : left).trim()
  const b = String(right == null ? '' : right).trim()
  if (!a || !b) return false
  if (a === b) return true
  const na = normalizeAccount(a)
  const nb = normalizeAccount(b)
  return Boolean(na && nb && na === nb)
}

export function matchEmployeeAccount(employee, account) {
  if (!employee || !account) return false
  return (
    accountsMatch(employee.login_account, account) ||
    accountsMatch(employee.employee_code, account) ||
    accountsMatch(employee.phone_number, account) ||
    accountsMatch(employee.phone, account) ||
    accountsMatch(employee.uid, account)
  )
}
