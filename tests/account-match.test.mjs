import assert from 'node:assert/strict'
import test from 'node:test'

import { accountsMatch, matchEmployeeAccount, normalizeAccount } from '../utils/account-match.mjs'

test('mini program phone 18163761233 maps to employee H04454 even if the stored account has a trailing digit', () => {
  assert.equal(normalizeAccount('181637612334'), '18163761233')
  assert.equal(normalizeAccount('+86 18163761233'), '18163761233')
  assert.equal(
    matchEmployeeAccount(
      { employee_code: 'H04454', login_account: '181637612334' },
      '18163761233'
    ),
    true
  )
  assert.equal(accountsMatch('H04454', 'H04454'), true)
})
