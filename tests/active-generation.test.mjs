import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  buildLockedPath,
  clearActiveGeneration,
  getActiveGeneration,
  resolveAllowedShowUrl,
  saveActiveGeneration,
  WORKSPACE_HOME_PATH
} from '../utils/active-generation.mjs'

function withStorage(initial = {}) {
  const storage = { ...initial }
  globalThis.uni = {
    setStorageSync(key, value) {
      storage[key] = value
    },
    getStorageSync(key) {
      return storage[key]
    },
    removeStorageSync(key) {
      delete storage[key]
    }
  }
  return storage
}

test('active generation storage saves and clears the in-flight task', () => {
  withStorage()
  assert.equal(saveActiveGeneration('task-9', '装修家居'), true)
  assert.deepEqual(getActiveGeneration(), { taskId: 'task-9', serviceEntry: '装修家居' })
  clearActiveGeneration()
  assert.equal(getActiveGeneration(), null)
})

test('unlock on generating page stays put instead of jumping to production', () => {
  assert.equal(
    resolveAllowedShowUrl('pages/generate/locked', { taskId: 'task-9', serviceEntry: '装修家居' }),
    ''
  )
  assert.equal(resolveAllowedShowUrl('pages/generate/generate', { taskId: 'task-9' }), '')
  assert.equal(resolveAllowedShowUrl('pages/manage/manage', null), '')
})

test('entry after process kill restores the generating page when a task is still active', () => {
  const session = { taskId: 'task-9', serviceEntry: '好评笔记' }
  assert.equal(resolveAllowedShowUrl('pages/index/index', session), buildLockedPath(session))
  assert.equal(resolveAllowedShowUrl('', session), '/pages/generate/locked?task_id=task-9&service_entry=%E5%A5%BD%E8%AF%84%E7%AC%94%E8%AE%B0')
  assert.equal(resolveAllowedShowUrl('pages/index/index', null), WORKSPACE_HOME_PATH)
})

test('app stays on current workspace page after unlock and only restores generation from entry', () => {
  const app = readFileSync(resolve(import.meta.dirname, '../App.vue'), 'utf8')
  const locked = readFileSync(resolve(import.meta.dirname, '../pages/generate/locked.vue'), 'utf8')
  const entry = readFileSync(resolve(import.meta.dirname, '../pages/index/index.vue'), 'utf8')

  assert.match(app, /resolveAllowedShowUrl\(route, getActiveGeneration\(\)\)/)
  assert.doesNotMatch(app, /if \(route !== 'pages\/generate\/generate'\) uni\.reLaunch/)
  assert.match(locked, /saveActiveGeneration\(this\.taskId, this\.serviceEntry\)/)
  assert.match(locked, /clearActiveGeneration\(\)/)
  assert.match(locked, /onShow\(\) \{/)
  assert.doesNotMatch(entry, /enterInternalWorkspace\(/)
})
