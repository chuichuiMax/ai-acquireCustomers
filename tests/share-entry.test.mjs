import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
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
  assert.match(sharedCase, /saveLastShareId\(this\.shareId\)/)
})
