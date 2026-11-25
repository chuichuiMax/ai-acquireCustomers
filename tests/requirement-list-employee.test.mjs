import assert from 'node:assert/strict'
import test from 'node:test'

import {
  extractEmployeeWorkCode,
  isAuthoritativeEmployeeWorkCode,
  mergeEmployeeProfile
} from '../utils/requirement-list-employee.mjs'

test('extractEmployeeWorkCode ignores platform user uid rows', () => {
  assert.equal(extractEmployeeWorkCode({ source: 'user', employee_code: 'mp_abc123' }), '')
  assert.equal(isAuthoritativeEmployeeWorkCode('H04454', { source: 'employee' }), true)
})

test('mergeEmployeeProfile keeps employee_code from login payload', () => {
  const merged = mergeEmployeeProfile(
    { employee_code: 'H04454', name: '徐迎港' },
    { login_account: '181637612334', name: '员工' }
  )
  assert.equal(extractEmployeeWorkCode(merged), 'H04454')
  assert.equal(merged.name, '徐迎港')
})

test('pickEmployeeListMatch prefers content employee row', () => {
  const pick = (list, keyword) => {
    const account = String(keyword || '').trim()
    const matches = list.filter(
      (item) =>
        String(item.login_account || '').trim() === account ||
        String(item.employee_code || '').trim() === account
    )
    const exactEmployee = matches.find((item) => item.source === 'employee' && item.employee_code)
    return exactEmployee || matches[0] || null
  }
  const picked = pick(
    [
      { source: 'user', employee_code: 'uid-xx', login_account: '18163761233' },
      { source: 'employee', employee_code: 'H04454', login_account: '18163761233' }
    ],
    '18163761233'
  )
  assert.equal(picked.employee_code, 'H04454')
})