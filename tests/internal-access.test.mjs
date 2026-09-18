import assert from 'node:assert/strict'
import test from 'node:test'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

import { createCachedInternalAccessEvaluator, evaluateInternalAccess } from '../utils/internal-access-policy.mjs'

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
