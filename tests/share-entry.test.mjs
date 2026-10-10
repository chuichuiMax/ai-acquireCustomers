import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import { resolveAllowedShowUrl } from '../utils/active-generation.mjs'
import {
  LAST_SHARE_MAX_AGE_MS,
  buildSharedCasePath,
  getLastShareId,
  saveLastShareId
} from '../utils/share-entry.mjs'

function withStorage(initial = {}) {
  const storage = { ...initial }
  globalThis.uni = {
    setStorageSync(key, value) { storage[key] = value },
    getStorageSync(key) { return storage[key] },
    removeStorageSync(key) { delete storage[key] }
  }
  return storage
}

test('recent share storage saves and restores a valid case id', () => {
  const storage = withStorage()
  assert.equal(saveLastShareId('case-123', 1000), true)
  assert.equal(getLastShareId(1000 + LAST_SHARE_MAX_AGE_MS - 1), 'case-123')
  assert.equal(storage.last_owner_share.shareId, 'case-123')
})

test('expired recent share storage is cleared', () => {
  const storage = withStorage()
  saveLastShareId('case-old', 1000)
  assert.equal(getLastShareId(1000 + LAST_SHARE_MAX_AGE_MS + 1), '')
  assert.equal(storage.last_owner_share, undefined)
})

test('shared-case path encodes the share id', () => {
  assert.equal(buildSharedCasePath('case / 123'), '/pages/materials/shared-case?shareId=case%20%2F%20123')
})

test('app and entry pages keep share routing ahead of workspace routing', () => {
  const app = readFileSync(resolve(import.meta.dirname, '../App.vue'), 'utf8')
  const entry = readFileSync(resolve(import.meta.dirname, '../pages/index/index.vue'), 'utf8')
  const sharedCase = readFileSync(resolve(import.meta.dirname, '../pages/materials/shared-case.vue'), 'utf8')

  assert.match(app, /shareIdFromLaunch\(options\)/)
  assert.match(app, /requireInternalAccess\(\{ redirect: false \}\)/)
  assert.match(app, /getLastShareId\(\)/)
  assert.match(app, /WORKSPACE_URL = '\/pages\/generate\/generate'/)
  assert.match(app, /LOGIN_URL = '\/pages\/login\/login'/)
  assert.match(app, /resolveAllowedShowUrl/)
  assert.doesNotMatch(entry, /enterInternalWorkspace\(/)
  assert.match(entry, /leaveWatchdog/)
  assert.match(entry, /LOGIN_PATH/)
  assert.match(sharedCase, /saveLastShareId\(this\.shareId\)/)
})

function loadApp({ route = 'pages/materials/shared-case', shareId = 'case-A', allowed = true, storage = {} } = {}) {
  const jumps = []
  let checks = 0
  let page = { route, options: { shareId } }
  const context = {
    resolveAllowedShowUrl,
    getActiveGeneration: () => storage.mp_active_generation || null,
    requireInternalAccess: async () => {
      checks += 1
      return typeof allowed === 'function' ? allowed() : allowed
    },
    getCurrentPages: () => [page],
    uni: {
      getStorageSync: (key) => storage[key],
      setStorageSync: (key, value) => { storage[key] = value },
      removeStorageSync: (key) => { delete storage[key] },
      reLaunch: ({ url }) => {
        jumps.push(url)
        const [path, query = ''] = url.split('?')
        page = { route: path.replace(/^\//, ''), options: Object.fromEntries(new URLSearchParams(query)) }
      }
    }
  }
  const shareSource = readFileSync(resolve(import.meta.dirname, '../utils/share-entry.mjs'), 'utf8')
    .replace(/export /g, '')
  const appSource = readFileSync(resolve(import.meta.dirname, '../App.vue'), 'utf8')
    .match(/<script>([\s\S]*?)<\/script>/)[1]
    .replace(/^import .*$/gm, '')
    .replace('export default', 'globalThis.app =')
  runInNewContext(shareSource, context)
  runInNewContext(appSource, context)
  const instance = context.app.data()
  return { context, instance, jumps, show: (options) => context.app.onShow.call(instance, options), get checks() { return checks } }
}

for (const scene of [1001, 1089]) {
  for (const route of ['pages/materials/materials', 'pages/materials/shared-case']) {
    test(`validated user reopening ${route} through scene ${scene} enters home`, async () => {
      const app = loadApp({ route })
      await app.show({ scene, path: route, query: {} })
      assert.deepEqual(app.jumps, ['/pages/generate/generate'])
      assert.equal(app.checks, 1)
    })
  }
}

test('a normal case entry ignores retained share parameters after identity validation', async () => {
  const app = loadApp()
  await app.show({ scene: 1089, path: 'pages/materials/shared-case', query: { shareId: 'case-A' } })
  assert.deepEqual(app.jumps, ['/pages/generate/generate'])
  assert.equal(app.checks, 1)
})

test('a visitor reopening a viewed case keeps the existing public case behavior', async () => {
  const app = loadApp({ allowed: false, storage: { last_owner_share: { shareId: 'case-A', savedAt: Date.now() } } })
  await app.show({ scene: 1089, path: 'pages/materials/shared-case', query: {} })
  assert.deepEqual(app.jumps, [])
})

for (const allowed of [true, false]) {
  test(`a share card keeps its case without internal validation when allowed=${allowed}`, async () => {
    const app = loadApp({ allowed })
    await app.show({ scene: 1007, path: 'pages/materials/shared-case', query: { shareId: 'case-A' } })
    assert.deepEqual(app.jumps, [])
    assert.equal(app.checks, 0)
  })
}

test('a second card opens its own case when the previous case page is still present', async () => {
  const app = loadApp()
  await app.show({ scene: 1008, path: 'pages/materials/shared-case', query: { shareId: 'case-B' } })
  assert.deepEqual(app.jumps, ['/pages/materials/shared-case?shareId=case-B'])
})

test('an earlier identity check cannot redirect a newer share-card entry', async () => {
  let finish
  const app = loadApp({ route: 'pages/materials/materials', allowed: () => new Promise((resolve) => { finish = resolve }) })
  const previous = app.show({ scene: 1089, query: {} })
  await app.show({ scene: 1007, query: { shareId: 'case-B' } })
  finish(true)
  await previous
  assert.deepEqual(app.jumps, ['/pages/materials/shared-case?shareId=case-B'])
})

test('normal entry on a generation page keeps the existing generation behavior', async () => {
  const app = loadApp({ route: 'pages/generate/locked', storage: { mp_active_generation: { taskId: 'task-9' } } })
  await app.show({ scene: 1089, query: {} })
  assert.deepEqual(app.jumps, [])
})

test('cold neutral entry still restores an active generation task', async () => {
  const app = loadApp({ route: 'pages/index/index', storage: { mp_active_generation: { taskId: 'task-9' } } })
  await app.show({ scene: 1089, path: 'pages/index/index', query: {} })
  assert.deepEqual(app.jumps, ['/pages/generate/locked?task_id=task-9&service_entry='])
})

test('a visitor with retained share parameters can view the case before recent-share storage exists', async () => {
  const app = loadApp({ allowed: false })
  await app.show({ scene: 1089, path: 'pages/materials/shared-case', query: { shareId: 'case-A' } })
  assert.deepEqual(app.jumps, [])
})

test('a visitor with no case history uses the existing login entry', async () => {
  const app = loadApp({ allowed: false, route: 'pages/materials/materials' })
  await app.show({ scene: 1089, query: {} })
  assert.deepEqual(app.jumps, ['/pages/login/login'])
})

test('a cold ordinary entry carrying an old case path enters home after validation', async () => {
  const app = loadApp({ route: 'pages/index/index' })
  await app.show({ scene: 1089, path: '/pages/materials/shared-case?shareId=case-A', query: {} })
  assert.deepEqual(app.jumps, ['/pages/generate/generate'])
})

test('a validation rejection from an older entry cannot replace a new share card with login', async () => {
  let fail
  const app = loadApp({ route: 'pages/materials/materials', allowed: () => new Promise((resolve, reject) => { fail = reject }) })
  const previous = app.show({ scene: 1089, query: {} })
  await app.show({ scene: 1044, query: { shareId: 'case-B' } })
  fail(new Error('old validation failed'))
  await previous
  assert.deepEqual(app.jumps, ['/pages/materials/shared-case?shareId=case-B'])
})

for (const route of ['pages/materials/materials', 'pages/materials/shared-case']) {
  for (const hidesApp of [true, false]) {
    for (const completeAt of ['beforeHide', 'beforeShow', 'afterShow']) {
      test(`preview return on ${route} preserves the page with hidesApp=${hidesApp}, completeAt=${completeAt}`, async () => {
        const app = loadApp({ route })
        let nativeOptions
        app.context.uni.previewImage = (options) => { nativeOptions = options }
        app.context.openCaseSystemPage('previewImage', { current: 'image-A', urls: ['image-A'] })
        if (completeAt === 'beforeHide') nativeOptions.complete({ errMsg: 'previewImage:ok' })
        if (hidesApp) app.context.app.onHide.call(app.instance)
        if (completeAt === 'beforeShow') nativeOptions.complete({ errMsg: 'previewImage:ok' })
        await app.show({ scene: 1089, query: {} })
        if (completeAt === 'afterShow') nativeOptions.complete({ errMsg: 'previewImage:ok' })
        assert.deepEqual(app.jumps, [])
        assert.equal(app.checks, 0)
        app.context.app.onHide.call(app.instance)
        await app.show({ scene: 1089, query: {} })
        assert.deepEqual(app.jumps, ['/pages/generate/generate'])
      })
    }
  }

  test(`double tapping a preview on ${route} preserves the first operation and allows another after return`, async () => {
    const app = loadApp({ route })
    const calls = []
    app.context.uni.previewImage = (options) => { calls.push(options) }
    app.context.openCaseSystemPage('previewImage', { current: 'image-A', urls: ['image-A'] })
    calls[0].complete({ errMsg: 'previewImage:ok' })
    app.context.app.onHide.call(app.instance)
    app.context.openCaseSystemPage('previewImage', { current: 'image-A', urls: ['image-A'] })
    assert.equal(calls.length, 1)
    await app.show({ scene: 1089, query: {} })
    assert.deepEqual(app.jumps, [])
    app.context.openCaseSystemPage('previewImage', { current: 'image-B', urls: ['image-B'] })
    assert.equal(calls.length, 2)
  })

  for (const hook of ['onShow', 'onUnload']) {
    test(`${hook} on ${route} clears a preview marker even without app lifecycle callbacks`, async () => {
      const app = loadApp({ route })
      const pageInstance = { ensureInternalAccess: async () => false }
      app.context.uni.previewImage = (options) => options.complete({ errMsg: 'previewImage:ok' })
      app.context.openCaseSystemPage('previewImage', { current: 'image-A', urls: ['image-A'] }, pageInstance)
      const pageSource = readFileSync(resolve(import.meta.dirname, `../${route}.vue`), 'utf8')
        .match(/<script>([\s\S]*?)<\/script>/)[1]
        .replace(/^import[\s\S]*?from ['"][^'"]+['"]\s*$/gm, '')
        .replace('export default', 'globalThis.casePage =')
      app.context.TabBar = {}
      app.context.internalPageMixin = {}
      app.context.clearTimeout = () => {}
      runInNewContext(pageSource, app.context)
      await app.context.casePage[hook].call(pageInstance)
      app.context.app.onHide.call(app.instance)
      await app.show({ scene: 1089, query: {} })
      assert.deepEqual(app.jumps, ['/pages/generate/generate'])
    })
  }
}

test('a failed preview that never hides the app does not suppress normal entry', async () => {
  const app = loadApp()
  app.context.uni.previewImage = (options) => options.complete({ errMsg: 'previewImage:fail invalid url' })
  app.context.openCaseSystemPage('previewImage', { current: 'image-A', urls: ['image-A'] })
  await app.show({ scene: 1089, query: {} })
  assert.deepEqual(app.jumps, ['/pages/generate/generate'])
})

test('a preview marker cannot suppress normal entry on a new instance of the same route', async () => {
  const app = loadApp()
  app.context.uni.previewImage = () => {}
  app.context.openCaseSystemPage('previewImage', { current: 'image-A', urls: ['image-A'] })
  app.context.app.onHide.call(app.instance)
  app.context.uni.reLaunch({ url: '/pages/materials/shared-case?shareId=case-B' })
  app.jumps.length = 0
  await app.show({ scene: 1089, query: {} })
  assert.deepEqual(app.jumps, ['/pages/generate/generate'])
})

test('a preview marker cannot suppress normal entry after navigating to another route', async () => {
  const app = loadApp()
  app.context.uni.previewImage = () => {}
  app.context.openCaseSystemPage('previewImage', { current: 'image-A', urls: ['image-A'] })
  app.context.app.onHide.call(app.instance)
  app.context.uni.reLaunch({ url: '/pages/index/index' })
  app.jumps.length = 0
  await app.show({ scene: 1089, query: {} })
  assert.deepEqual(app.jumps, ['/pages/generate/generate'])
})

test('a late callback from an old preview cannot clear a newer preview marker', async () => {
  const app = loadApp()
  const calls = []
  app.context.uni.previewImage = (options) => { calls.push(options) }
  app.context.openCaseSystemPage('previewImage', { current: 'image-A', urls: ['image-A'] })
  app.context.app.onHide.call(app.instance)
  await app.show({ scene: 1089, query: {} })
  app.context.openCaseSystemPage('previewImage', { current: 'image-B', urls: ['image-B'] })
  calls[0].complete({ errMsg: 'previewImage:fail cancel' })
  calls[1].complete({ errMsg: 'previewImage:ok' })
  app.context.app.onHide.call(app.instance)
  await app.show({ scene: 1089, query: {} })
  assert.deepEqual(app.jumps, [])
})

test('a cancelled phone operation that never hides the app does not suppress normal entry', async () => {
  const app = loadApp()
  app.context.uni.makePhoneCall = (options) => options.complete({ errMsg: 'makePhoneCall:fail cancel' })
  app.context.openCaseSystemPage('makePhoneCall', { phoneNumber: '19900000001' })
  await app.show({ scene: 1089, query: {} })
  assert.deepEqual(app.jumps, ['/pages/generate/generate'])
})

test('returning from a case phone call preserves the case page', async () => {
  const app = loadApp()
  app.context.uni.makePhoneCall = () => {}
  app.context.openCaseSystemPage('makePhoneCall', { phoneNumber: '19900000001' })
  app.context.app.onHide.call(app.instance)
  await app.show({ scene: 1089, query: {} })
  assert.deepEqual(app.jumps, [])
})

test('a fresh share card still opens its target after a system operation hid the case page', async () => {
  const app = loadApp()
  app.context.uni.previewImage = () => {}
  app.context.openCaseSystemPage('previewImage', { current: 'image-A', urls: ['image-A'] })
  app.context.app.onHide.call(app.instance)
  await app.show({ scene: 1007, query: { shareId: 'case-B' } })
  assert.deepEqual(app.jumps, ['/pages/materials/shared-case?shareId=case-B'])
})
