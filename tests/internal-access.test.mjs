import assert from 'node:assert/strict'
import test from 'node:test'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  createCachedInternalAccessEvaluator,
  evaluateInternalAccess,
  hasMiniProgramPort
} from '../utils/internal-access-policy.mjs'

test('uni-app access wrapper has no same-name mjs module that can shadow it', () => {
  const utils = resolve(import.meta.dirname, '../utils')

  assert.equal(existsSync(resolve(utils, 'internal-access.js')), true)
  assert.equal(existsSync(resolve(utils, 'internal-access.mjs')), false)
  assert.equal(existsSync(resolve(utils, 'internal-access-policy.mjs')), true)
})

test('missing local token cannot enter the internal workspace', async () => {
  const result = await evaluateInternalAccess({
    token: '',
    getMe: async () => ({ employee: { id: 'should-not-be-called' } })
  })

  assert.deepEqual(result, { allowed: false, clearToken: false })
})

test('validated employee can enter the internal workspace', async () => {
  const result = await evaluateInternalAccess({
    token: 'valid-employee-token',
    getMe: async () => ({ employee: { id: 'employee-1', name: '测试员工' } })
  })

  assert.deepEqual(result, { allowed: true, clearToken: false })
})

test('rejected identity clears the stale token and denies internal access', async () => {
  const result = await evaluateInternalAccess({
    token: 'expired-token',
    getMe: async () => {
      throw new Error('MP_UNAUTHORIZED')
    }
  })

  assert.deepEqual(result, { allowed: false, clearToken: true })
})

test('the same token reuses one successful employee check across pages', async () => {
  let calls = 0
  const evaluator = createCachedInternalAccessEvaluator()
  const getMe = async () => {
    calls += 1
    return { employee: { id: 'employee-1' } }
  }

  assert.equal((await evaluator.evaluate('valid-token', getMe)).allowed, true)
  assert.equal((await evaluator.evaluate('valid-token', getMe)).allowed, true)
  assert.equal(calls, 1)

  await evaluator.evaluate('new-token', getMe)
  assert.equal(calls, 2)
})

test('APP login port is treated as mini-program permission', () => {
  assert.equal(hasMiniProgramPort(['pc', 'app']), true)
  assert.equal(hasMiniProgramPort(['app']), true)
  assert.equal(hasMiniProgramPort('APP'), true)
  assert.equal(hasMiniProgramPort('PC&APP'), true)
  assert.equal(hasMiniProgramPort('pc_app'), true)
  assert.equal(hasMiniProgramPort('["pc","app"]'), true)
  assert.equal(hasMiniProgramPort(['pc']), false)
})

test('password-login PC user identity is not enough without APP login port', async () => {
  const result = await evaluateInternalAccess({
    token: 'pc-user-token',
    getMe: async () => ({
      id: 12,
      uid: '18163761233',
      username: '内部员工',
      phone_number: '18163761233'
    })
  })

  assert.equal(result.allowed, false)
  assert.equal(result.clearToken, true)
})

test('employee with only APP port can enter the mini program', async () => {
  const result = await evaluateInternalAccess({
    token: 'app-user-token',
    getMe: async () => ({
      employee: {
        id: 'only-app',
        login_account: '13975171659',
        login_port: ['app']
      }
    })
  })

  assert.equal(result.allowed, true)
})

test('employee with PC and APP ports can enter the mini program', async () => {
  const result = await evaluateInternalAccess({
    token: 'pc-user-token',
    getMe: async () => ({
      employee: {
        id: 'H04454',
        name: '徐迎港',
        employee_code: 'H04454',
        login_account: '18163761233',
        login_port: ['pc', 'app']
      }
    })
  })

  assert.equal(result.allowed, true)
})

test('employee with only PC port cannot enter the mini program', async () => {
  const result = await evaluateInternalAccess({
    token: 'pc-user-token',
    getMe: async () => ({
      employee: {
        id: 'only-pc',
        login_account: '18100000000',
        login_port: ['pc']
      }
    })
  })

  assert.equal(result.allowed, false)
  assert.equal(result.clearToken, true)
})
