import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

const employee = { id: 'employee-test', login_account: 'test-account' }
const tick = () => new Promise((resolve) => setImmediate(resolve))

function createSession(token = 'old-token', timers = { setTimeout, clearTimeout }) {
  const requests = []
  const uploads = []
  const modals = []
  const jumps = []
  const context = {
    BASE_URL: 'https://ai.hi-run.net', TOKEN_KEY: 'mp_token',
    WORKSPACE_HOME_PATH: '/pages/generate/generate',
    getActiveGeneration: () => null, resolveAllowedShowUrl: () => '',
    getCurrentPages: () => [{ route: 'pages/generate/generate' }],
    uni: {
      $emit: () => {},
      getStorageSync: () => token,
      setStorageSync: (key, value) => { token = value },
      removeStorageSync: () => { token = '' },
      request: (options) => requests.push(options),
      uploadFile: (options) => uploads.push(options),
      showModal: (options) => modals.push(options),
      showToast: () => {},
      reLaunch: ({ url, success }) => { jumps.push(url); if (success) success() },
      redirectTo: ({ url, success }) => { jumps.push(url); if (success) success() }
    },
    ...timers
  }
  function load(path, names) {
    const source = readFileSync(new URL(path, import.meta.url), 'utf8')
      .replace(/^import[\s\S]*?from ['"][^'"]+['"]\r?$/gm, '').replace(/^export /gm, '')
    const bindings = names.map((name) => `${name}: typeof ${name} === 'undefined' ? undefined : ${name}`)
    const exports = vm.runInNewContext(`(function () { ${source}\nreturn { ${bindings.join(',')} } })()`, context)
    Object.assign(context, exports)
    return exports
  }
  load('../utils/safe-navigation.js', ['safeReLaunch'])
  const request = load('../utils/request.js', ['request', 'uploadFile', 'getToken', 'setToken', 'errorMessage'])
  load('../utils/internal-access-policy.mjs', ['createCachedInternalAccessEvaluator', 'evaluateInternalAccess', 'employeeFromMe', 'hasMiniProgramAccess'])
  const api = load('../apis/mp.js', ['mpMeApi'])
  const access = load('../utils/internal-access.js', ['requireInternalAccess', 'acceptConfirmedLogin', 'internalPageMixin'])
  return { ...request, ...access, api, requests, uploads, modals, jumps, get token() { return token } }
}

test('identity uses only the mini-program endpoint with a 15-second timeout', async () => {
  const session = createSession()
  const check = session.api.mpMeApi.get()
  assert.equal(session.requests[0].url, 'https://ai.hi-run.net/api/mp/me')
  assert.equal(session.requests[0].timeout, 15000)
  session.requests[0].success({ statusCode: 200, data: { employee } })
  await check
  assert.equal(session.requests.length, 1)
})

test('a response taking 12 seconds is not cut off by a second access timer', async () => {
  const timers = []
  const session = createSession('old-token', {
    setTimeout: (callback, delay) => { timers.push({ callback, delay }); return timers.length },
    clearTimeout: () => {}
  })
  const check = session.requireInternalAccess()
  await tick()
  for (const timer of timers.filter((timer) => timer.delay <= 12000)) timer.callback()
  assert.equal(session.requests[0].timeout, 15000)
  assert.equal(session.token, 'old-token')
  assert.deepEqual(session.jumps, [])
  session.requests[0].success({ statusCode: 200, data: { employee } })
  assert.equal(await check, true)
  assert.equal(session.modals.length, 0)
})

test('an old request 401 cannot clear the newly logged-in token or navigate', async () => {
  const session = createSession()
  const check = session.request({ url: '/api/mp/content/form-schema' })
  session.setToken('new-token')
  session.requests[0].success({ statusCode: 401, data: {} })
  await assert.rejects(check)
  assert.equal(session.token, 'new-token')
  assert.deepEqual(session.jumps, [])
})

test('an old upload 401 cannot clear the newly logged-in token or navigate', async () => {
  const session = createSession()
  const upload = session.uploadFile({ url: '/api/mp/content/uploads/cover', filePath: 'test-file' })
  session.setToken('new-token')
  session.uploads[0].success({ statusCode: 401, data: '{}' })
  await assert.rejects(upload)
  assert.equal(session.token, 'new-token')
  assert.deepEqual(session.jumps, [])
})

test('silent identity requests leave cleanup and navigation to the access check', async () => {
  const session = createSession()
  const check = session.api.mpMeApi.get({ silentAuth: true })
  session.requests[0].success({ statusCode: 401, data: {} })
  await assert.rejects(check)
  assert.equal(session.token, 'old-token')
  assert.deepEqual(session.jumps, [])
})

for (const failure of [{ errMsg: 'request:fail timeout' }, { errMsg: 'request:fail network' }, { statusCode: 503, data: {} }]) {
  test(`temporary identity failure preserves the token and resumes after manual retry: ${failure.errMsg || failure.statusCode}`, async () => {
    const session = createSession()
    const check = session.requireInternalAccess()
    if (failure.statusCode) session.requests[0].success(failure)
    else session.requests[0].fail(failure)
    await tick()
    assert.equal(session.token, 'old-token')
    assert.deepEqual(session.jumps, [])
    assert.equal(session.modals.length, 1)
    assert.equal(session.requests.length, 1)
    session.modals[0].success({ confirm: true })
    await tick()
    assert.equal(session.requests.length, 2)
    session.requests[1].success({ statusCode: 200, data: { employee } })
    assert.equal(await check, true)
    assert.equal(session.token, 'old-token')
  })
}

test('a real identity 401 clears the matching token and returns to login', async () => {
  const session = createSession()
  const check = session.requireInternalAccess()
  session.requests[0].success({ statusCode: 401, data: {} })
  assert.equal(await check, false)
  assert.equal(session.token, '')
  assert.deepEqual(session.jumps, ['/pages/login/login'])
})

test('an employee without APP permission remains blocked', async () => {
  const session = createSession()
  const check = session.requireInternalAccess()
  session.requests[0].success({ statusCode: 200, data: { employee: { ...employee, login_port: ['pc'] } } })
  assert.equal(await check, false)
  assert.equal(session.token, '')
  assert.deepEqual(session.jumps, ['/pages/login/login'])
})

test('a missing identity API reports a version problem without trying PC authentication', async () => {
  const session = createSession()
  const check = session.requireInternalAccess()
  session.requests[0].success({ statusCode: 404, data: {} })
  await tick()
  assert.match(session.modals[0].content, /服务版本/)
  assert.equal(session.token, 'old-token')
  assert.equal(session.requests.length, 1)
  session.modals[0].success({ confirm: true })
  await tick()
  session.requests[1].success({ statusCode: 200, data: { employee } })
  assert.equal(await check, true)
})

test('confirmed login seeds the session without another identity request', async () => {
  const session = createSession('')
  session.acceptConfirmedLogin({ access_token: 'confirmed-token', employee })
  assert.equal(session.token, 'confirmed-token')
  assert.equal(await session.requireInternalAccess(), true)
  assert.equal(session.requests.length, 0)
  assert.throws(() => session.acceptConfirmedLogin({ access_token: '', employee }))
  assert.equal(session.token, 'confirmed-token')
})

test('a previous identity response cannot undo confirmed login', async () => {
  const session = createSession()
  const old = session.requireInternalAccess()
  session.acceptConfirmedLogin({ access_token: 'confirmed-token', employee })
  session.requests[0].success({ statusCode: 401, data: {} })
  await assert.rejects(old, (error) => error.code === 'INTERNAL_ACCESS_STALE')
  assert.equal(session.token, 'confirmed-token')
  assert.deepEqual(session.jumps, [])
  assert.equal(await session.requireInternalAccess(), true)
})

test('concurrent page lifecycle checks share the retry and resume their initialization', async () => {
  const session = createSession()
  const instance = session.internalPageMixin.data()
  instance.ensureInternalAccess = session.internalPageMixin.methods.ensureInternalAccess.bind(instance)
  const load = instance.ensureInternalAccess()
  const show = instance.ensureInternalAccess()
  assert.equal(session.requests.length, 1)
  session.requests[0].fail({ errMsg: 'request:fail timeout' })
  await tick()
  assert.equal(session.modals.length, 1)
  session.modals[0].success({ confirm: true })
  await tick()
  session.requests[1].success({ statusCode: 200, data: { employee } })
  assert.deepEqual(await Promise.all([load, show]), [true, true])
  assert.equal(instance.internalAccessGranted, true)
})
