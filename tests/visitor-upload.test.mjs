import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import test from 'node:test'

function client(statusCode) {
  let token = 'employee-token'
  const calls = [], jumps = []
  const source = readFileSync(new URL('../utils/request.js', import.meta.url), 'utf8')
    .replace(/^import .*$/gm, '').replace(/^export /gm, '')
  const context = {
    BASE_URL: 'https://example.test', TOKEN_KEY: 'token',
    getCurrentPages: () => [{ route: 'pages/materials/shared-case' }],
    safeReLaunch: path => jumps.push(path),
    uni: {
      getStorageSync: () => token, setStorageSync: (key, value) => { token = value },
      removeStorageSync: () => { token = '' }, $emit() {},
      uploadFile: options => { calls.push(options); options.success({ statusCode, data: '{}' }) }
    }
  }
  const api = runInNewContext(`${source}\n({ uploadFile })`, context)
  return { api, calls, jumps, token: () => token }
}

test('anonymous appointment upload omits employee credentials', async () => {
  const app = client(200)
  await app.api.uploadFile({ url: '/appointment', filePath: 'avatar.png', requiresAuth: false })
  assert.equal(app.calls[0].header.Authorization, undefined)
  assert.equal(app.token(), 'employee-token')
})

test('expired visitor session leaves employee login intact and returns the error', async () => {
  const app = client(401)
  await assert.rejects(app.api.uploadFile({ url: '/appointment', filePath: 'avatar.png', requiresAuth: false }),
    error => error.statusCode === 401)
  assert.equal(app.token(), 'employee-token')
  assert.deepEqual(app.jumps, [])
})

test('ordinary employee uploads retain the existing authentication behavior', async () => {
  const app = client(401)
  await assert.rejects(app.api.uploadFile({ url: '/upload', filePath: 'room.png' }),
    error => error.statusCode === 401)
  assert.equal(app.calls[0].header.Authorization, 'Bearer employee-token')
  assert.equal(app.token(), '')
  assert.deepEqual(app.jumps, ['/pages/login/login'])
})
